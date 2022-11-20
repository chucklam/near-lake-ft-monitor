const path = require("path");
const homedir = require("os").homedir();
const { KeyPair, keyStores } = require("near-api-js");
const { parseSeedPhrase } = require('near-seed-phrase');

const HELP = `This script adds a new account to the keystore in the local filesystem.
The account is defined by its account ID (e.g. "test-account.near") and its seedphrase.

Please run this script in the following format:

    node update-keystore ACCOUNT_ID "<SEEDPHRASE>"

where <SEEDPHRASE> is 12 words.
`;

const NETWORK_ID = 'mainnet';

// Get keystore in local file system
const CREDENTIALS_DIR = '.near-credentials';
const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
const keyStore = new keyStores.UnencryptedFileSystemKeyStore(credentialsPath);

if (process.argv.length !== 4) {
  console.info(HELP);
  process.exit(1);
}

// to create a seed phrase with its corresponding Keys
// const { seedPhrase, publicKey, secretKey } = generateSeedPhrase();
const seedPhrase = process.argv[3];
const accountId = process.argv[2];

if (seedPhrase.split(' ').length != 12) {
  console.info(HELP);
  process.exit(1);
}

// Recover public/private keys from the seed phrase
const parsed = parseSeedPhrase(seedPhrase);
// console.log(parsed);

// Convert to KeyPair object
const keypair = KeyPair.fromString(parsed.secretKey);

// Store keypair in key store
keyStore.setKey(NETWORK_ID, accountId, keypair).then(() => {
  console.log(
    `Credentials for ${accountId} was written to keystore at ${keyStore.keyDir}`
  );
})
