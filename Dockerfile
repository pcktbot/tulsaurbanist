# Dockerfile
FROM ruby:3.2.2

# Install dependencies including Node.js and npm
RUN apt-get update -qq && apt-get install -y nodejs npm postgresql-client

# Install Bun globally
RUN npm install -g bun

WORKDIR /app

# Bundle install separately for caching
COPY Gemfile Gemfile.lock ./
RUN bundle install

# Add application code
COPY . .

# Install JavaScript dependencies with Bun
RUN bun install

# Build JavaScript assets with webpack
RUN bun run webpack

# Precompile Rails assets (skip webpacker since we already built JS)
RUN WEBPACKER_PRECOMPILE=false bundle exec rails assets:precompile

# Configure Rails
ENV RAILS_ENV=production
ENV RAILS_SERVE_STATIC_FILES=true

EXPOSE 3000

# Start Rails
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "8080"]