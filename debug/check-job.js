// debug/check-job.js
require('dotenv').config();
const { ethers } = require('ethers');
const config = require('../src/config');
const encryption = require('../src/encryption');

// ABI imports (simplified versions)
const MarketplaceV1ABI = [
  "function jobsLength() view returns (uint256)",
  "function getJob(uint256 jobId_) view returns (tuple(uint8 state, bool whitelistWorkers, tuple(address creator, address arbitrator, address worker) roles, string title, string[] tags, bytes32 contentHash, bool multipleApplicants, uint256 amount, address token, uint32 timestamp, uint32 maxTime, string deliveryMethod, uint256 collateralOwed, uint256 escrowId, bytes32 resultHash, uint8 rating, bool disputed))",
  "function postThreadMessage(uint256 jobId_, bytes32 contentHash_, address recipient) external",
  "function takeJob(uint256 jobId_, bytes signature_) external"
];

const MarketplaceDataV1ABI = [
  "function userRegistered(address) view returns (bool)",
  "function publicKeys(address) view returns (bytes)"
];

async function main() {
  try {
    console.log("Job Checker Debug Tool");
    console.log("=====================");
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Initialize contract instances
    const marketplace = new ethers.Contract(
      process.env.MARKETPLACE_ADDRESS,
      MarketplaceV1ABI,
      wallet
    );

    const marketplaceData = new ethers.Contract(
      process.env.MARKETPLACE_DATA_ADDRESS,
      MarketplaceDataV1ABI,
      wallet
    );
    
    // Get total job count
    const jobCount = await marketplace.jobsLength();
    console.log(`Total jobs found: ${jobCount}`);
    
    // Check for your job (Job #505)
    const jobId = process.argv[2] || Number(jobCount) - 1;
    console.log(`\nChecking job #${jobId} specifically...`);
    
    const job = await marketplace.getJob(jobId);
    
    // Create properly structured job object
    const jobObj = {
      id: jobId,
      title: job[3] || `Job #${jobId}`,
      state: Number(job[0]) || 0,
      roles: {
        creator: job[2]?.creator || wallet.address,
        arbitrator: job[2]?.arbitrator || ethers.ZeroAddress,
        worker: job[2]?.worker || ethers.ZeroAddress
      },
      multipleApplicants: Boolean(job[6]),
      tags: Array.isArray(job[4]) ? job[4] : [],
      contentHash: job[5] || '0x0000000000000000000000000000000000000000000000000000000000000000',
    };
    
    console.log("\nProcessed Job Details:");
    console.log(`- ID: ${jobObj.id}`);
    console.log(`- Title: ${jobObj.title}`);
    console.log(`- State: ${jobObj.state}`);
    console.log(`- Multiple Applicants: ${jobObj.multipleApplicants}`);
    console.log(`- Creator: ${jobObj.roles.creator}`);
    console.log(`- Tags: ${jobObj.tags.join(', ')}`);
    console.log(`- Content Hash: ${jobObj.contentHash}`);
    
    // Get content if available
    let content = '';
    if (jobObj.contentHash && jobObj.contentHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      try {
        const contentCid = encryption.hashToCid(jobObj.contentHash);
        console.log(`\nFetching content with CID: ${contentCid}`);
        content = await encryption.getFromIpfs(contentCid);
        console.log(`Content retrieved (${content.length} characters)`);
        console.log("First 200 characters:");
        console.log(content.substring(0, 200) + "...");
      } catch (error) {
        console.error(`Error fetching content: ${error.message}`);
      }
    } else {
      console.log("\nNo content hash available for this job");
    }
    
    // Check if job matches relevant keywords
    const relevantTags = ['discord', 'bot', 'automation', 'chatbot'];
    
    console.log("\nChecking job relevance:");
    
    // Check title
    const titleMatches = relevantTags.some(tag => 
      jobObj.title.toLowerCase().includes(tag.toLowerCase())
    );
    console.log(`- Title matches: ${titleMatches}`);
    
    // Check tags
    const tagMatches = jobObj.tags.some(tag => 
      relevantTags.some(relevantTag => 
        tag.toLowerCase().includes(relevantTag.toLowerCase())
      )
    );
    console.log(`- Tags match: ${tagMatches}`);
    
    // Check content
    const contentMatches = content && relevantTags.some(tag => 
      content.toLowerCase().includes(tag.toLowerCase())
    );
    console.log(`- Content matches: ${contentMatches}`);
    
    const isRelevant = titleMatches || tagMatches || contentMatches;
    console.log(`\nOverall relevance: ${isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}`);
    
    // Try to apply for the job if relevant
    if (isRelevant && process.argv.includes('--apply')) {
      console.log("\nAttempting to apply for this job...");
      
      // Create application message
      const applicationMessage = `
Hello! I'm an AI agent specialized in creating Discord bots.

After reviewing your requirements, I'd be happy to help you create your Discord bot with:
- Basic moderation commands
- Role management functionality
- Welcome messages
- Custom slash commands
- Message filtering/moderation

I can deliver this within 24 hours. The bot will be built using Discord.js and Node.js as requested.

Would you like to proceed with the development of your Discord bot?
      `;
      
      // Get owner's public key for encryption
      const ownerPublicKey = await marketplaceData.publicKeys(jobObj.roles.creator);
      
      if (!ownerPublicKey || ownerPublicKey === '0x') {
        console.error("\nOwner public key not available for this job");
        return;
      }
      
      // Generate session key for secure communication
      const sessionKey = await encryption.getSessionKey(wallet, ownerPublicKey, jobId);
      
      // Publish the application to IPFS
      console.log("\nPublishing application to IPFS...");
      const { hash } = await encryption.publishToIpfs(applicationMessage, sessionKey);
      console.log(`Application published with hash: ${hash}`);
      
      // Convert hash to bytes32 format
      const contentHashBytes = ethers.keccak256(ethers.toUtf8Bytes(hash));
      
      // Post thread message
      console.log(`\nPosting thread message for job ${jobId}...`);
      const tx = await marketplace.postThreadMessage(jobId, contentHashBytes, jobObj.roles.creator);
      const receipt = await tx.wait();
      
      console.log(`Transaction hash: ${receipt.hash}`);
      console.log(`Successfully applied for job ${jobId}`);
      
      // If not multiple applicants, attempt to take the job
      if (!jobObj.multipleApplicants) {
        console.log(`\nJob ${jobId} is non-multipleApplicants, attempting to take it...`);
        
        try {
          // Get the events length (revision)
          const eventsLength = await marketplaceData.eventsLength(jobId);
          
          // Create and sign the message
          const messageHash = ethers.keccak256(
            ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [eventsLength, jobId])
          );
          
          const messageBytes = ethers.getBytes(messageHash);
          const signature = await wallet.signMessage(messageBytes);
          
          // Take the job
          const takeTx = await marketplace.takeJob(jobId, signature);
          const takeReceipt = await takeTx.wait();
          
          console.log(`Take job transaction hash: ${takeReceipt.hash}`);
          console.log(`Successfully took job ${jobId}`);
        } catch (error) {
          console.error(`Error taking job: ${error.message}`);
        }
      }
    }
    
    console.log("\nJob check complete");
  } catch (error) {
    console.error('Error checking job:', error);
  }
}

main().catch(console.error);