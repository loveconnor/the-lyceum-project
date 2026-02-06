import { Lab, LabTemplateType, LabStatus, Difficulty } from "@/app/(main)/labs/types";
import { UnifiedLabData } from "@/types/lab-templates";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

console.log("Labs API initialized with base URL:", API_BASE_URL);

interface CreateLabPayload {
  title: string;
  description?: string;
  template_type: LabTemplateType;
  template_data: UnifiedLabData;
  difficulty?: Difficulty;
  estimated_duration?: number;
  topics?: string[];
  due_date?: string;
}

interface UpdateLabPayload {
  title?: string;
  description?: string;
  template_data?: UnifiedLabData;
  status?: LabStatus;
  difficulty?: Difficulty;
  estimated_duration?: number;
  topics?: string[];
  starred?: boolean;
  due_date?: string | null;
  completed_at?: string | null;
}

interface UpdateProgressPayload {
  step_id: string;
  step_data?: unknown;
  completed: boolean;
}

interface AddCommentPayload {
  text: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  // Get the auth token from Supabase client
  const { createClient } = await import("@/utils/supabase/client");
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  return {
    "Content-Type": "application/json",
    ...(session?.access_token && {
      Authorization: `Bearer ${session.access_token}`,
    }),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchLabs(): Promise<Lab[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs`, { headers });
  return handleResponse<Lab[]>(response);
}

export async function fetchLabById(id: string): Promise<Lab> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${id}`, { headers });
  return handleResponse<Lab>(response);
}

export async function createLab(payload: CreateLabPayload): Promise<Lab> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<Lab>(response);
}

export async function updateLab(id: string, payload: UpdateLabPayload): Promise<Lab> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<Lab>(response);
}

export async function deleteLab(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${id}`, {
    method: "DELETE",
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

export async function resetLab(id: string): Promise<Lab> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${id}/reset`, {
    method: "POST",
    headers,
  });
  return handleResponse<Lab>(response);
}

export async function updateLabProgress(
  labId: string,
  payload: UpdateProgressPayload
): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${labId}/progress`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

export async function fetchLabProgress(labId: string): Promise<NonNullable<Lab["lab_progress"]>> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${labId}`, { headers });
  const lab = await handleResponse<Lab>(response);
  return lab.lab_progress || [];
}

export async function addLabComment(labId: string, payload: AddCommentPayload): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${labId}/comments`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

export async function deleteLabComment(labId: string, commentId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${labId}/comments/${commentId}`, {
    method: "DELETE",
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

export async function generateLab(payload: {
  learningGoal: string;
  context?: string;
  path_id?: string;
  userProfile?: {
    level?: string;
    interests?: string[];
    completedTopics?: string[];
  };
}): Promise<Lab> {
  console.log("generateLab called with:", payload);
  console.log("API_BASE_URL:", API_BASE_URL);
  
  const headers = await getAuthHeaders();
  console.log("Auth headers:", headers);
  
  const response = await fetch(`${API_BASE_URL}/labs/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  
  console.log("Response status:", response.status);
  console.log("Response ok:", response.ok);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Error response:", errorText);
  }
  
  return handleResponse<Lab>(response);
}

export async function getLabAIAssistance(
  labId: string,
  prompt: string,
  context?: unknown
): Promise<{ assistance: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/labs/${labId}/ai-assist`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, context }),
  });
  return handleResponse<{ assistance: string }>(response);
}
