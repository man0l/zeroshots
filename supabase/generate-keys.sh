#!/usr/bin/env bash
set -euo pipefail

JWT_SECRET=$(openssl rand -base64 32)
SECRET_KEY_BASE=$(openssl rand -base64 64)

ANON_KEY=$(node -e "
const c=require('crypto'), s='$JWT_SECRET';
const b=x=>Buffer.from(x).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\\//g,'_');
const h=b(JSON.stringify({alg:'HS256',typ:'JWT'}));
const iat=Math.floor(Date.now()/1000), exp=iat+10*365*86400;
const p=b(JSON.stringify({role:'anon',iss:'supabase',iat,exp}));
const sig=c.createHmac('sha256',s).update(h+'.'+p).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\\//g,'_');
console.log(h+'.'+p+'.'+sig);
")

SERVICE_ROLE_KEY=$(node -e "
const c=require('crypto'), s='$JWT_SECRET';
const b=x=>Buffer.from(x).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\\//g,'_');
const h=b(JSON.stringify({alg:'HS256',typ:'JWT'}));
const iat=Math.floor(Date.now()/1000), exp=iat+10*365*86400;
const p=b(JSON.stringify({role:'service_role',iss:'supabase',iat,exp}));
const sig=c.createHmac('sha256',s).update(h+'.'+p).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\\//g,'_');
console.log(h+'.'+p+'.'+sig);
")

echo "JWT_SECRET=$JWT_SECRET"
echo "ANON_KEY=$ANON_KEY"
echo "SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY"
echo "SECRET_KEY_BASE=$SECRET_KEY_BASE"
