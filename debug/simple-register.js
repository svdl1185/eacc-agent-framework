// simple-register.js
require('dotenv').config();
const { ethers } = require('ethers');

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function registerUser(bytes pubkey_, string name_, string bio_, string avatar_) external",
  "function userRegistered(address) view returns (bool)",
  "function publicKeys(address) view returns (bytes)"
];

async function getEncryptionSigningKey(wallet) {
  // Implementation from the previous file
  const privateKeyBuffer = Buffer.from(wallet.privateKey.slice(2), 'hex');
  
  let publicKey;
  try {
    // Try to get the public key directly if available
    publicKey = wallet.publicKey;
    
    if (!publicKey) {
      console.log('Public key not directly available, deriving from private key...');
      publicKey = ethers.computePublicKey(wallet.privateKey, false); // false for uncompressed
      console.log(`Derived public key: ${publicKey}`);
    }
  } catch (error) {
    console.error('Error accessing or deriving public key:', error);
    publicKey = ethers.computePublicKey(wallet.privateKey, false);
    console.log(`Fallback derived public key: ${publicKey}`);
  }
  
  let compressedPublicKey;
  if (publicKey.startsWith('0x04')) {
    // This is an uncompressed key, take only the x-coordinate for simplicity
    compressedPublicKey = '0x' + publicKey.slice(4, 68);
  } else {
    compressedPublicKey = publicKey;
  }
  
  console.log(`Using compressed public key: ${compressedPublicKey}`);
  
  return {
    privateKey: privateKeyBuffer,
    compressedPublicKey
  };
}

async function registerSimpleUser() {
  console.log('Simple User Registration Tool');
  console.log('============================');
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Using wallet address: ${wallet.address}`);
  
  // Initialize contract instance
  const marketplaceData = new ethers.Contract(
    process.env.MARKETPLACE_DATA_ADDRESS,
    MarketplaceDataV1ABI,
    wallet
  );
  
  try {
    // Check if already registered
    const isRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nWallet already registered: ${isRegistered}`);
    
    if (isRegistered) {
      // Get current public key
      const currentKey = await marketplaceData.publicKeys(wallet.address);
      console.log(`Currently registered public key: ${currentKey}`);
    }
    
    // Get encryption signing key
    const signingKey = await getEncryptionSigningKey(wallet);
    
    // Agent details
    const agentName = process.env.AGENT_NAME || 'BotAgent';
    const agentBio = process.env.AGENT_BIO || 'AI agent for the EACC marketplace';
    const agentAvatar = process.env.AGENT_AVATAR || '';
    
    console.log('\nAgent details:');
    console.log(`- Name: ${agentName}`);
    console.log(`- Bio: ${agentBio}`);
    console.log(`- Avatar URL: ${agentAvatar}`);
    
    // Register user
    console.log('\nRegistering user...');
    const tx = await marketplaceData.registerUser(
      signingKey.compressedPublicKey,
      agentName,
      agentBio,
      agentAvatar
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log('Waiting for transaction confirmation...');
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log('\n✅ User registered successfully!');
    
    // Verify registration
    const verifyRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nVerification - Wallet registered: ${verifyRegistered}`);
    
    const verifyKey = await marketplaceData.publicKeys(wallet.address);
    console.log(`Verification - Registered public key: ${verifyKey}`);
    
    console.log('\nYou should now be able to decrypt messages in the EACC interface.');
  } catch (error) {
    console.error('Error registering user:', error);
  }
}

registerSimpleUser().catch(console.error);