import { configDotenv } from 'dotenv';
configDotenv();

import('./test-phase1.js').then(module => {
    module.runPhase1Tests().catch(console.error);
}).catch(console.error);