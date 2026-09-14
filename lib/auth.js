import {scryptSync,timingSafeEqual,createHmac,randomBytes} from 'node:crypto';
export function checkPassword(password, encoded=process.env.APP_PASSWORD_HASH){
 if(typeof password!=='string'||password.length>256||!encoded)return false;
 const [tag,salt,hex]=encoded.split(':');if(tag!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hex))return false;
 return timingSafeEqual(scryptSync(password,salt,64),Buffer.from(hex,'hex'));
}
function key(){const k=process.env.SESSION_SECRET;if(!k||k.length<32)throw Error('Configure SESSION_SECRET');return k}
export function issue(now=Date.now()){const p=Buffer.from(JSON.stringify({exp:now+8*3600000,nonce:randomBytes(20).toString('hex')})).toString('base64url');return p+'.'+createHmac('sha256',key()).update(p).digest('base64url')}
export function valid(token,now=Date.now()){try{if(typeof token!=='string'||token.length>800)return false;const [p,s,...extra]=token.split('.');if(extra.length)return false;const sig=Buffer.from(s||'','base64url'),expected=createHmac('sha256',key()).update(p).digest();if(sig.length!==expected.length||!timingSafeEqual(sig,expected))return false;const body=JSON.parse(Buffer.from(p,'base64url'));return Number.isFinite(body.exp)&&body.exp>now&&body.exp<=now+8*3600000}catch{return false}}
export function secure(req,res){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');if(!valid(req.headers.authorization?.replace(/^Bearer /,''))){res.statusCode=401;res.end('Faça login novamente.');return false}return true}
