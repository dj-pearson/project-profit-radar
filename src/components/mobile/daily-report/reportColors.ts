/** Badge classes for the daily report status fields. */
export const getTaskStatusColor = (status: string) => {
  switch (status) {
    case 'ahead': return 'bg-green-100 text-green-800 border-green-200';
    case 'on_track': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'behind': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'blocked': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getEquipmentConditionColor = (condition: string) => {
  switch (condition) {
    case 'good': return 'bg-green-100 text-green-800 border-green-200';
    case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'needs_repair': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'down': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};
