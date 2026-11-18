// Οι ρυθμίσεις είναι στο app.json. Εδώ αλλάζει μόνο η διεύθυνση της ιστοσελίδας όταν το ζητήσει το build
// (EXPO_BASE_URL): η προεπισκόπηση ενός PR ζει στο /kleise-thesi/pr-preview/pr-<αριθμός> (.github/workflows/preview.yml).
module.exports = ({ config }) => ({
  ...config,
  experiments: { ...config.experiments, baseUrl: process.env.EXPO_BASE_URL || config.experiments?.baseUrl },
});
