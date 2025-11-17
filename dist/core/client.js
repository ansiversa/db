import { createClient } from "@libsql/client";
import { getDbConfig } from "../config";
let coreClient = null;
const buildClient = (config) => createClient({
    url: config.url,
    authToken: config.authToken,
});
export const getCoreClient = () => {
    if (!coreClient) {
        const { core } = getDbConfig();
        coreClient = buildClient(core);
    }
    return coreClient;
};
export const resetCoreClient = () => {
    coreClient = null;
};
