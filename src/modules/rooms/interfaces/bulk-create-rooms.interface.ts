import { Room } from '../entities/room.entity';

/** Một item trong plan preview/confirm tạo phòng hàng loạt. */
export type BulkRoomPreviewItem = Record<string, unknown>;

/** Plan nội bộ dùng chung cho preview và confirm bulk-create rooms. */
export interface BulkCreateRoomsPlan {
  summary: {
    total: number;
    validCount: number;
    skippedCount: number;
    conflictCount: number;
    canConfirm: boolean;
  };
  validRooms: BulkRoomPreviewItem[];
  skippedItems: BulkRoomPreviewItem[];
  conflictItems: BulkRoomPreviewItem[];
  internalValidEntities: Room[];
}

/** Response public của API preview bulk-create rooms. */
export type BulkCreateRoomsPreviewResult = Omit<BulkCreateRoomsPlan, 'internalValidEntities'>;

/** Response public của API confirm bulk-create rooms. */
export interface BulkCreateRoomsConfirmResult extends BulkCreateRoomsPreviewResult {
  createdRooms: unknown[];
}
