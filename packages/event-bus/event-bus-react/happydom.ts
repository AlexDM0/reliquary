import { GlobalRegistrator } from '@happy-dom/global-registrator';

// Registers window/document/etc. as globals so React + Testing Library can
// render under `bun test`. Preloaded via bunfig.toml.
GlobalRegistrator.register();
