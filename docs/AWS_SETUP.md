# AWS Setup & Amazon Bedrock Configuration

RouteWise AI supports two operational modes:
1. **Deterministic Mock Mode (Default)**: 100% locally runnable, requires zero AWS credentials or configuration, and incurs zero cloud cost.
2. **Amazon Bedrock Mode**: Uses the official boto3 `bedrock-runtime` Converse API for model-driven tool selection and grounded logistics explanations.

---

## 1. Prerequisites for Amazon Bedrock Mode

1. An active AWS Account.
2. Amazon Bedrock access enabled in your chosen region (e.g., `us-east-1` or `us-west-2`).
3. Model access granted for Anthropic Claude 3.5 Sonnet (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`) or Amazon Nova Pro in the Amazon Bedrock Console.

---

## 2. Setting Up AWS Authentication Safely

Never hardcode AWS credentials in source files, prompts, or frontend configuration.

RouteWise AI uses the **standard AWS credential provider chain**:

### Option A: AWS CLI (Recommended)
```bash
aws configure
# Enter AWS Access Key ID, Secret Access Key, and Default Region (e.g. us-east-1)
```

### Option B: Environment Variables
```bash
export AWS_ACCESS_KEY_ID="your-access-key-id"
export AWS_SECRET_ACCESS_KEY="your-secret-access-key"
export AWS_REGION="us-east-1"
```

---

## 3. Least-Privilege IAM Policy

Attach this least-privilege IAM policy to your AWS user or execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RouteWiseBedrockConverseAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:Converse"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    }
  ]
}
```

---

## 4. Activating Bedrock Mode in RouteWise AI

Edit `.env` (or `backend/.env`):

```bash
# Switch provider from mock to bedrock
AI_PROVIDER=bedrock

# Set your active region and model
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
```

Restart the backend server:
```bash
python scripts/run_local.py
```

---

## 5. Cost Safety & Safeguards

- **Bounded Agent Turns:** Tool-calling loops are hard-capped at a maximum of 5 iterations per query.
- **Stateless Architecture:** No persistent AWS compute, databases, or paid serverless resources are provisioned.
- **Instant Fallback:** If AWS credentials are removed or invalid, RouteWise AI surfaces a clear configuration message without crashing and lets you switch back to Mock Mode in the UI Settings.

