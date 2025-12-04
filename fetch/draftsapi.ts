import { PrefixedApi } from './commons/BaseApi';
import apiConfig from './config/apiConfig';

export interface Draft {
    id: string;
    content: string;
    mediaIds: string[];
    createdAt: number;
    updatedAt: number;
}

export interface CreateDraftDto {
    content?: string;
    mediaIds?: string[];
}

export interface UpdateDraftDto {
    content?: string;
    mediaIds?: string[];
}

class DraftsApi extends PrefixedApi {
    constructor(config: typeof apiConfig) {
        super(config, '/api/drafts');
    }

    async getAllDrafts(): Promise<Draft[]> {
        return this.get<Draft[]>('');
    }

    async getDraftById(id: string): Promise<Draft> {
        return this.get<Draft>(`/${id}`);
    }

    async createDraft(data: CreateDraftDto): Promise<Draft> {
        return this.post<Draft>('', data);
    }

    async updateDraft(id: string, data: UpdateDraftDto): Promise<Draft> {
        return this.put<Draft>(`/${id}`, data);
    }

    async deleteDraft(id: string): Promise<{ message: string }> {
        return this.delete<{ message: string }>(`/${id}`);
    }
}

export default DraftsApi;
