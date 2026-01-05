import { LearningPath } from "@/app/(main)/paths/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

interface CreatePathPayload {
  title: string;
  description?: string;
  topics?: string[];
  difficulty?: string;
  estimated_duration?: number;
  items?: CreatePathItemPayload[];
}

interface CreatePathItemPayload {
  lab_id?: string;
  title: string;
  description?: string;
  item_type?: 'lab' | 'reading' | 'video' | 'quiz' | 'project';
}

interface UpdatePathPayload {
  title?: string;
  description?: string;
  topics?: string[];
  difficulty?: string;
  estimated_duration?: number;
  status?: string;
  starred?: boolean;
}

interface UpdatePathItemPayload {
  status?: string;
  title?: string;
  description?: string;
  progress_data?: {
    reading_completed?: boolean;
    examples_completed?: boolean;
    visuals_completed?: boolean;
    reading?: {
      current_chapter?: number;
      current_question_index?: number;
      selected_option?: string | null;
      is_correct?: boolean | null;
      completed_chapters?: number[];
      completed_questions?: number[];
    };
    examples?: {
      current_example?: number;
      expanded_steps?: number[];
      viewed_examples?: number[];
      viewed_concepts?: number[];
      viewed_exercises?: number[];
    };
    visuals?: {
      active_visual?: string;
      viewed_visuals?: number[];
    };
  };
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

// Fetch all learning paths for the current user
export async function fetchPaths(): Promise<LearningPath[]> {
  const headers = await getAuthHeaders();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/paths`, { 
      headers,
      cache: "no-store"
    });
  } catch (err) {
    console.warn("fetchPaths network error, falling back to empty list", err);
    return [];
  }
  return handleResponse<LearningPath[]>(response);
}

// Fetch a single learning path by ID
export async function fetchPathById(id: string): Promise<LearningPath> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${id}`, { 
    headers,
    cache: "no-store"
  });
  return handleResponse<LearningPath>(response);
}

// Create a new learning path
export async function createPath(payload: CreatePathPayload): Promise<LearningPath> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<LearningPath>(response);
}

// AI-generate a learning path with modules and content
export async function generatePath(payload: CreatePathPayload): Promise<LearningPath> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<LearningPath>(response);
}

// Update a learning path
export async function updatePath(id: string, payload: UpdatePathPayload): Promise<LearningPath> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<LearningPath>(response);
}

// Delete a learning path
export async function deletePath(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${id}`, {
    method: "DELETE",
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

// Update a path item status or progress
export async function updatePathItemStatus(
  pathId: string, 
  itemId: string, 
  status: string
): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items/${itemId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status }),
  });
  return handleResponse<any>(response);
}

// Update path item progress data
export async function updatePathItemProgress(
  pathId: string,
  itemId: string,
  progressData: UpdatePathItemPayload['progress_data']
): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items/${itemId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ progress_data: progressData }),
  });
  return handleResponse<any>(response);
}

// Add an item to a learning path
export async function addPathItem(
  pathId: string, 
  payload: CreatePathItemPayload
): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  return handleResponse<any>(response);
}

// Delete a path item
export async function deletePathItem(pathId: string, itemId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items/${itemId}`, {
    method: "DELETE",
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }
}

// Fetch a single path item (module) by ID
export async function fetchPathItem(pathId: string, itemId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items/${itemId}`, {
    headers,
    cache: "no-store"
  });
  return handleResponse<any>(response);
}

// Render a registry-backed module on demand
export async function renderRegistryModule(pathId: string, itemId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/paths/${pathId}/items/${itemId}/render`, {
    headers,
    cache: "no-store"
  });
  return handleResponse<any>(response);
}
