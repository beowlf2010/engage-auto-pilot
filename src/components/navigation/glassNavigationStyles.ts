
export const getGlassColorClasses = (color: string, isActive: boolean): string => {
  const colorMap = {
    blue: {
      active: 'bg-blue-500/20 text-blue-700 shadow-lg shadow-blue-500/25 border border-blue-500/30',
      hover: 'hover:bg-blue-500/10 hover:text-blue-700 hover:shadow-md hover:shadow-blue-500/20 hover:scale-105'
    },
    green: {
      active: 'bg-green-500/20 text-green-700 shadow-lg shadow-green-500/25 border border-green-500/30',
      hover: 'hover:bg-green-500/10 hover:text-green-700 hover:shadow-md hover:shadow-green-500/20 hover:scale-105'
    },
    purple: {
      active: 'bg-purple-500/20 text-purple-700 shadow-lg shadow-purple-500/25 border border-purple-500/30',
      hover: 'hover:bg-purple-500/10 hover:text-purple-700 hover:shadow-md hover:shadow-purple-500/20 hover:scale-105'
    },
    orange: {
      active: 'bg-orange-500/20 text-orange-700 shadow-lg shadow-orange-500/25 border border-orange-500/30',
      hover: 'hover:bg-orange-500/10 hover:text-orange-700 hover:shadow-md hover:shadow-orange-500/20 hover:scale-105'
    },
    red: {
      active: 'bg-red-500/20 text-red-700 shadow-lg shadow-red-500/25 border border-red-500/30',
      hover: 'hover:bg-red-500/10 hover:text-red-700 hover:shadow-md hover:shadow-red-500/20 hover:scale-105'
    },
    gray: {
      active: 'bg-gray-500/20 text-gray-700 shadow-lg shadow-gray-500/25 border border-gray-500/30',
      hover: 'hover:bg-gray-500/10 hover:text-gray-700 hover:shadow-md hover:shadow-gray-500/20 hover:scale-105'
    }
  };

  return isActive ? colorMap[color]?.active || '' : colorMap[color]?.hover || '';
};
