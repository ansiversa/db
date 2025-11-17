const DEFAULT_CORE_URL_VAR = "ANSIVERSA_CORE_DB_URL";
const DEFAULT_CORE_AUTH_VAR = "TURSO_AUTH_TOKEN";
const defaultAppUrlVar = (appName) => `ANSIVERSA_${appName.toUpperCase()}_DB_URL`;
const requireEnv = (name) => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};
const buildConnectionConfig = (urlVar, authVar) => ({
    url: requireEnv(urlVar),
    authToken: requireEnv(authVar),
});
export const loadEnvConfig = (options = {}) => {
    const coreUrlVar = options.coreUrlVar ?? DEFAULT_CORE_URL_VAR;
    const coreAuthVar = options.coreAuthTokenVar ?? DEFAULT_CORE_AUTH_VAR;
    const defaultAuthVar = options.defaultAuthTokenVar ?? coreAuthVar;
    const apps = options.apps ?? [];
    const appConfigs = {};
    for (const appName of apps) {
        const urlVar = options.appUrlVar ? options.appUrlVar(appName) : defaultAppUrlVar(appName);
        const authVar = options.appAuthTokenVars?.[appName] ?? defaultAuthVar;
        appConfigs[appName] = buildConnectionConfig(urlVar, authVar);
    }
    return {
        core: buildConnectionConfig(coreUrlVar, coreAuthVar),
        apps: appConfigs,
    };
};
