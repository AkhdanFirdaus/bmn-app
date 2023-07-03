module.exports = {
  apps : [{
    name: 'bmn-app',
    script: 'node',
    args: 'index.js',
    interpreter: 'none',
    watch: true,
    merge_logs: true,
    env: {
      NODE_ENV: 'local'
    }
  }]
};