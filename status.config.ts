export interface StatusConfig {
  name: string;
  logoUrl: string | null;
  productUrl: string;
  repositoryUrl: string;
}

export const statusConfig: StatusConfig = {
  name: "Standards Status",
  logoUrl: null,
  productUrl: "https://standards.new",
  repositoryUrl: "https://github.com/andyoucreate/standards-status",
};
