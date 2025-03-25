// debug/job-inspector.js
require('dotenv').config();
const { ethers } = require('ethers');
const config = require('../src/config');

// Define ABI for marketplace contract
const MarketplaceV1ABI = [
  "function jobsLength() view returns (uint256)",
  "function getJob(uint256 jobId_) view returns (tuple(uint8 state, bool whitelistWorkers, tuple(address creator, address arbitrator, address worker) roles, string title, string[] tags, bytes32 contentHash, bool multipleApplicants, uint256 amount, address token, uint32 timestamp, uint32 maxTime, string deliveryMethod, uint256 collateralOwed, uint256 escrowId, bytes32 resultHash, uint8 rating, bool disputed))"
];

async function main() {
  try {
    console.log('Job Inspector - Debug Tool');
    console.log('=========================');
    
    // Initialize provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Initialize marketplace contract
    const marketplace = new ethers.Contract(
      process.env.MARKETPLACE_ADDRESS, 
      MarketplaceV1ABI, 
      wallet
    );
    
    // Get total job count
    const jobCount = await marketplace.jobsLength();
    console.log(`Total jobs found: ${jobCount}`);
    
    // Get latest job ID (your new job should be here)
    const latestJobId = Number(jobCount) - 1;
    
    // Get job details for the latest job
    console.log(`\nFetching details for job #${latestJobId}:`);
    const job = await marketplace.getJob(latestJobId);
    
    // Print raw job data for debugging
    console.log('\nRaw Job Data:');
    console.log(JSON.stringify(job, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2));
    
    // Try to access specific properties
    console.log('\nAccessing specific properties:');
    console.log('Title:', job.title);
    console.log('State:', job.state);
    console.log('Content Hash:', job.contentHash);
    console.log('Tags:', job.tags);
    console.log('Creator Address:', job.roles.creator);
    
    // Check if properties exist on the job object
    console.log('\nProperty check:');
    console.log('Has title property:', job.hasOwnProperty('title'));
    console.log('Job keys:', Object.keys(job));
    
    // In ethers v6, array/tuple results are often numeric indices
    console.log('\nNumeric indices check:');
    for (let i = 0; i < 20; i++) {
      if (job[i] !== undefined) {
        console.log(`job[${i}] =`, job[i]);
      }
    }
    
    console.log('\nJob Inspector complete');
  } catch (error) {
    console.error('Error in Job Inspector:', error);
  }
}

main().catch(console.error);