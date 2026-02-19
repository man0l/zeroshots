generate_jwt_secret() {
  if command -v openssl &> /dev/null; then
    openssl rand -base64 32
  else
    cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
  fi
}

echo "JWT_SECRET=$(generate_jwt_secret)"
echo "ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.6D7R0zBz6Q0"
echo "SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.1eGI0"
echo "SECRET_KEY_BASE=$(generate_jwt_secret)$(generate_jwt_secret)"
