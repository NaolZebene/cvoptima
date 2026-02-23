const DEFAULT_API_BASE = 'http://localhost:3000/api/v1';

const normalizeApiBase = (rawBase) => {
  const candidate = (rawBase || DEFAULT_API_BASE).trim().replace(/\/+$/, '');

  if (!candidate) return DEFAULT_API_BASE;

  if (candidate.endsWith('/api/v1')) return candidate;

  return `${candidate}/api/v1`;
};

export default normalizeApiBase;
