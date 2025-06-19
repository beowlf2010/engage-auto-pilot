
export const isVehicleAvailable = (vehicle: any): boolean => {
  // GM Global orders should never be considered "sold" in the traditional sense
  if (vehicle.source_report === 'orders_all') {
    const statusNum = parseInt(vehicle.status);
    // Available: 6000 (CTP) + 5000-5999 (Available for delivery)
    return statusNum === 6000 || (statusNum >= 5000 && statusNum <= 5999);
  }
  return vehicle.status === 'available';
};

export const getVehicleStatusDisplay = (vehicle: any) => {
  if (vehicle.source_report === 'orders_all') {
    const statusNum = parseInt(vehicle.status);
    
    if (statusNum === 6000) {
      return { label: 'Customer Take Possession (CTP)', color: 'bg-green-100 text-green-800' };
    } else if (statusNum >= 5000 && statusNum <= 5999) {
      return { label: 'Available for Delivery', color: 'bg-green-100 text-green-800' };
    } else if (statusNum >= 3800 && statusNum <= 4999) {
      return { label: 'In Transit', color: 'bg-blue-100 text-blue-800' };
    } else if (statusNum >= 2500 && statusNum <= 3799) {
      return { label: 'In Production', color: 'bg-yellow-100 text-yellow-800' };
    } else if (statusNum >= 2000 && statusNum <= 2499) {
      return { label: 'Placed/Waiting', color: 'bg-orange-100 text-orange-800' };
    } else if (vehicle.status === 'available') {
      return { label: 'Order Active', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { label: vehicle.gm_status_description || vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  }
  
  switch (vehicle.status) {
    case 'available':
      return { label: 'Available', color: 'bg-green-100 text-green-800' };
    case 'sold':
      return { label: 'Sold', color: 'bg-blue-100 text-blue-800' };
    case 'pending':
      return { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    default:
      return { label: vehicle.status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
  }
};

export const getGMGlobalStatusCounts = async () => {
  // This would be called from the active inventory service
  // to get proper counts without including "sold" GM Global orders
  return {
    available: 0, // Orders ready for delivery (5000-5999, 6000)
    inTransit: 0, // Orders in transit (3800-4999)
    inProduction: 0, // Orders in production (2500-3799)
    placed: 0 // Orders placed/waiting (2000-2499)
  };
};
