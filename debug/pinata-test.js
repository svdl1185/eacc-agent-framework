// pinata-test.js
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');

/**
 * Test Pinata IPFS connection
 */
async function testPinataConnection() {
  console.log('Pinata IPFS Connection Test');
  console.log('=========================');
  
  // Print configuration (obscuring secrets)
  console.log(`IPFS API URL: ${process.env.IPFS_API_URL}`);
  console.log(`IPFS API Key: ${process.env.IPFS_API_KEY ? '****' + process.env.IPFS_API_KEY.slice(-4) : 'Not set'}`);
  console.log(`IPFS API Secret: ${process.env.IPFS_API_SECRET ? '****' + process.env.IPFS_API_SECRET.slice(-4) : 'Not set'}`);
  
  try {
    // 1. Test Pinata authentication using the /data/testAuthentication endpoint
    console.log('\nTesting Pinata authentication...');
    const authResponse = await axios.get(
      `${process.env.IPFS_API_URL}/data/testAuthentication`,
      {
        headers: {
          'pinata_api_key': process.env.IPFS_API_KEY,
          'pinata_secret_api_key': process.env.IPFS_API_SECRET
        }
      }
    );
    
    console.log('✅ Authentication successful!');
    console.log(`Response: ${JSON.stringify(authResponse.data)}`);
    
    // 2. Test uploading a file to IPFS via Pinata
    console.log('\nTesting file upload to Pinata...');
    const testContent = `This is a test file created at ${new Date().toISOString()}`;
    
    const form = new FormData();
    
    // Add file to form
    form.append('file', Buffer.from(testContent), {
      filename: 'test.txt',
      contentType: 'text/plain',
    });
    
    // Add metadata - FIXED: Using strings instead of boolean/objects
    const metadata = JSON.stringify({
      name: `test-upload-${Date.now()}`,
      keyvalues: {
        test: "true",  // Changed from boolean to string
        timestamp: Date.now().toString()  // Convert timestamp to string
      }
    });
    form.append('pinataMetadata', metadata);
    
    // Upload to Pinata
    const uploadResponse = await axios.post(
      `${process.env.IPFS_API_URL}/pinning/pinFileToIPFS`,
      form,
      {
        maxBodyLength: Infinity,
        headers: {
          'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
          'pinata_api_key': process.env.IPFS_API_KEY,
          'pinata_secret_api_key': process.env.IPFS_API_SECRET
        }
      }
    );
    
    const ipfsHash = uploadResponse.data.IpfsHash;
    console.log('✅ File uploaded successfully!');
    console.log(`IPFS Hash: ${ipfsHash}`);
    console.log(`Pin Size: ${uploadResponse.data.PinSize}`);
    
    // 3. Test retrieving the file via gateway
    console.log('\nTesting file retrieval from gateway...');
    const gatewayUrl = `${process.env.IPFS_GATEWAY_URL || 'https://gateway.pinata.cloud/ipfs/'}${ipfsHash}`;
    console.log(`Gateway URL: ${gatewayUrl}`);
    
    const retrieveResponse = await axios.get(gatewayUrl, { timeout: 10000 });
    
    if (retrieveResponse.data === testContent) {
      console.log('✅ File retrieved successfully!');
      console.log(`Content matches: ${retrieveResponse.data}`);
    } else {
      console.log('⚠️ Retrieved content does not match uploaded content');
      console.log(`Uploaded: ${testContent}`);
      console.log(`Retrieved: ${retrieveResponse.data}`);
    }
    
    console.log('\nPinata IPFS test completed successfully!');
  } catch (error) {
    console.error('❌ Pinata test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status} - ${error.response.statusText}`);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    
    console.log('\nPotential solutions:');
    console.log('1. Check if your Pinata API keys are correct');
    console.log('2. Make sure your Pinata account is active');
    console.log('3. Verify that you have sufficient storage quota on Pinata');
    console.log('4. Check that your API URL is correct (should be https://api.pinata.cloud)');
  }
}

testPinataConnection().catch(console.error);