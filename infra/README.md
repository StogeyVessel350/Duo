# Infrastructure

AWS us-east-1, Terraform + Helm, GitOps via ArgoCD.

See [`../docs/phase_3_backend_architecture.md`](../docs/phase_3_backend_architecture.md) §11 for rationale.

## Layout

```
infra/
├── terraform/
│   ├── modules/       Reusable modules (vpc, eks, rds, elasticache, msk, s3)
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── prod/
└── helm/              Chart for each backend service
```

## Apply

```bash
cd terraform/environments/dev
terraform init
terraform plan
terraform apply
```

Production access is gated — plan must be reviewed and applied via CI, not manually.

## State

Terraform state lives in `s3://duo-tfstate-{env}`, locked via DynamoDB.
