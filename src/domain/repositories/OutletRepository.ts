export interface OutletRecord {
  id: string;
  name: string;
  address: string | null;
  phone?: string | null;
  owner_id?: string;
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OutletListParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface OutletRepository {
  findByOwnerId(ownerId: string, params?: OutletListParams): Promise<{ outlets: OutletRecord[]; total: number }>;
  findById(id: string): Promise<OutletRecord | null>;
  findByIdAndOwner(id: string, ownerId: string): Promise<OutletRecord | null>;
  findIdsByOwnerId(ownerId: string): Promise<string[]>;
  create(data: { name: string; ownerId: string }): Promise<OutletRecord>;
  update(id: string, data: { name: string }): Promise<OutletRecord>;
  delete(id: string): Promise<void>;
  countByOwnerId(ownerId: string): Promise<number>;
}
