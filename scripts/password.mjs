import {scryptSync,randomBytes} from 'node:crypto';
// Read via hidden TTY, never password arguments or shell history.
if(!process.stdin.isTTY)throw Error('Execute em um terminal interativo');
process.stdout.write('Senha (oculta): ');process.stdin.setRawMode(true);process.stdin.resume();let value='';
process.stdin.on('data',chunk=>{for(const c of chunk.toString()){if(c==='\u0003')process.exit(1);if(c==='\r'||c==='\n'){process.stdin.setRawMode(false);const salt=randomBytes(16).toString('hex');console.log('\nAPP_PASSWORD_HASH=scrypt:'+salt+':'+scryptSync(value,salt,64).toString('hex'));console.log('SESSION_SECRET='+randomBytes(32).toString('hex'));process.exit()}if(c==='\u007f')value=value.slice(0,-1);else value+=c}});
