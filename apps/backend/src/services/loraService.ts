type StartLoraTrainingInput = {
  tenantId: string;
  clientId: string;
  trainingImages: string[];
  triggerWord: string;
  steps: number;
  learningRate: number;
  modelBase: 'flux-dev' | 'flux-pro';
};

type ReviewLoraModelInput = {
  tenantId: string;
  clientId: string;
  jobId: string;
  approvedBy?: string | null;
};

function unavailableError() {
  return new Error('LoRA pipeline indisponivel nesta build.');
}

export async function listLoraJobs(_tenantId: string, _clientId: string) {
  return [];
}

export async function startLoraTraining(_input: StartLoraTrainingInput) {
  throw unavailableError();
}

export async function approveLoraModel(_input: ReviewLoraModelInput) {
  throw unavailableError();
}

export async function rejectLoraModel(_input: ReviewLoraModelInput) {
  throw unavailableError();
}
