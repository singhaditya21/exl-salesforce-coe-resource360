export function isDeveloperEditionShellArtifact(value) {
    try {
        const url = new URL(value);
        return url.hostname.endsWith(".herokuapp.com")
            && url.pathname.startsWith("/developer-edition/$assetsDir/");
    } catch {
        return false;
    }
}
