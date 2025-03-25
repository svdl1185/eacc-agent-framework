// check-wallet-registration.js
require('dotenv').config();
const { ethers } = require('ethers');
const encryption = require('../src/encryption');

// ABI for MarketplaceDataV1
const MarketplaceDataV1ABI = [
  "function publicKeys(address) view returns (bytes)",
  "function userRegistered(address) view returns (bool)",
  "function users(address) view returns (tuple(address userAddress, bytes publicKey, string name, string bio, string avatar, uint16 ratingSum, uint16 ratingCount))"
];

async function checkWalletRegistration() {
  console.log('Wallet Registration Check Tool');
  console.log('=============================');
  
  // Initialize provider and wallet
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log(`Using wallet address: ${wallet.address}`);
  
  // Initialize contract instances
  const marketplaceData = new ethers.Contract(
    process.env.MARKETPLACE_DATA_ADDRESS,
    MarketplaceDataV1ABI,
    wallet
  );
  
  // Check if user is registered
  try {
    const isRegistered = await marketplaceData.userRegistered(wallet.address);
    console.log(`\nIs wallet registered: ${isRegistered}`);
    
    if (isRegistered) {
      // Get public key
      const registeredPublicKey = await marketplaceData.publicKeys(wallet.address);
      console.log(`\nRegistered public key: ${registeredPublicKey}`);
      
      // Get user data
      try {
        const userData = await marketplaceData.users(wallet.address);
        console.log('\nUser data:');
        console.log(`- Address: ${userData.userAddress}`);
        console.log(`- Name: ${userData.name}`);
        console.log(`- Bio: ${userData.bio}`);
        console.log(`- Rating sum: ${userData.ratingSum}`);
        console.log(`- Rating count: ${userData.ratingCount}`);
      } catch (error) {
        console.log('\nError fetching user data:', error.message);
      }
      
      // Get encryption signing key from wallet
      const signingKey = await encryption.getEncryptionSigningKey(wallet);
      console.log(`\nCalculated public key: ${signingKey.compressedPublicKey}`);
      
      // Check if keys match
      const keysMatch = signingKey.compressedPublicKey === registeredPublicKey;
      console.log(`\nDo keys match? ${keysMatch}`);
      
      if (!keysMatch) {
        console.log('\n⚠️ Your current wallet has a different public key than what is registered on the platform!');
        console.log('This could explain why message decryption is failing.');
        console.log('\nSuggestion: Re-register your user on the platform using:');
        console.log(`
const signingKey = await encryption.getEncryptionSigningKey(wallet);
await marketplaceData.registerUser(
  signingKey.compressedPublicKey,
  "${process.env.AGENT_NAME || 'Your Agent Name'}",
  "${process.env.AGENT_BIO || 'Your Agent Bio'}",
  "${process.env.AGENT_AVATAR || 'Your Agent Avatar URL'}"
);`);
      }
    } else {
      console.log('\n⚠️ Your wallet is not registered on the platform!');
      console.log('You need to register before you can send/receive encrypted messages.');
      console.log('\nSuggestion: Register your user on the platform using:');
      console.log(`
const signingKey = await encryption.getEncryptionSigningKey(wallet);
await marketplaceData.registerUser(
  signingKey.compressedPublicKey,
  "${process.env.AGENT_NAME || 'Your Agent Name'}",
  "${process.env.AGENT_BIO || 'Your Agent Bio'}",
  "${process.env.AGENT_AVATAR || 'Your Agent Avatar URL'}"
);`);
    }
  } catch (error) {
    console.error('Error checking wallet registration:', error);
  }
}

checkWalletRegistration().catch(console.error);