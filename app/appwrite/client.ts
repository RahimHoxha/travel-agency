import { Account, Client, Databases, Storage } from "appwrite";

export const appwriteConfig = {
  endpointUrl: import.meta.env.VITE_APPWRITE_API_ENDPOINT,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
  apiKey: import.meta.env.VITE_APPWRITE_API_KEY,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
  userCollectionId: import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID,
  tripCollectionId: import.meta.env.VITE_APPWRITE_TRIPS_COLLECTION_ID,
};

const client = new Client();

// Validate endpoint and project before setting them on the client.
// Calling `setEndpoint` with an empty value causes the Appwrite SDK to throw.
const endpoint = appwriteConfig.endpointUrl ?? "";
const projectId = appwriteConfig.projectId ?? "";

if (!endpoint) {
  // Keep the client instance but avoid calling setEndpoint with an empty string.
  // Log a clear message so it's obvious what's misconfigured during development.
  // Consumers of `client` may still attempt requests and will fail — that's expected
  // until a valid endpoint is provided.
  // eslint-disable-next-line no-console
  console.error(
    "Appwrite endpoint is not set. Please set `VITE_APPWRITE_API_ENDPOINT` in your environment."
  );
} else {
  client.setEndpoint(String(endpoint));
}

if (projectId) {
  client.setProject(String(projectId));
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "Appwrite project ID is not set. Please set `VITE_APPWRITE_PROJECT_ID` in your environment."
  );
}

const account = new Account(client);
const database = new Databases(client);
const storage = new Storage(client);

export { client, account, database, storage };
