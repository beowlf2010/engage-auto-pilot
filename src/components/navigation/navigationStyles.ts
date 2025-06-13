
export const getColorClasses = (color: string, isActive: boolean): string => {
  const colorMap = {
    blue: {
      active: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg',
      hover: 'hover:bg-blue-50 hover:text-blue-700 border-b-2 border-transparent hover:border-blue-500'
    },
    green: {
      active: 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg',
      hover: 'hover:bg-green-50 hover:text-green-700 border-b-2 border-transparent hover:border-green-500'
    },
    purple: {
      active: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg',
      hover: 'hover:bg-purple-50 hover:text-purple-700 border-b-2 border-transparent hover:border-purple-500'
    },
    orange: {
      active: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg',
      hover: 'hover:bg-orange-50 hover:text-orange-700 border-b-2 border-transparent hover:border-orange-500'
    },
    red: {
      active: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg',
      hover: 'hover:bg-red-50 hover:text-red-700 border-b-2 border-transparent hover:border-red-500'
    },
    gray: {
      active: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg',
      hover: 'hover:bg-gray-50 hover:text-gray-700 border-b-2 border-transparent hover:border-gray-500'
    }
  };

  return isActive ? colorMap[color]?.active || '' : colorMap[color]?.hover || '';
};
