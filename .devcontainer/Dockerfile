FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

# Install Ruby 3.1.7
RUN apt-get update && \
    apt-get install -y software-properties-common && \
    add-apt-repository ppa:brightbox/ruby-ng && \
    apt-get update && \
    apt-get install -y ruby3.1 ruby3.1-dev

# Set Ruby 3.1 as default
RUN update-alternatives --set ruby /usr/bin/ruby3.1 && \
    update-alternatives --set gem /usr/bin/gem3.1