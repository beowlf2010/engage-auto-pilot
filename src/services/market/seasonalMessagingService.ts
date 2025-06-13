
// Get seasonal campaign messages
export const getSeasonalMessage = (): string | null => {
  const now = new Date();
  const month = now.getMonth();
  const day = now.getDate();

  // Holiday and seasonal messaging
  if (month === 11 && day >= 20) { // Late December
    return "Year-end pricing won't last long";
  } else if (month === 0) { // January
    return "New year, new car? Start fresh with great deals";
  } else if (month === 2 || month === 3) { // March-April (Spring)
    return "Spring into a new vehicle with fresh inventory";
  } else if (month === 4 && day >= 15) { // Mid-May (graduation season)
    return "Graduation season specials available";
  } else if (month >= 5 && month <= 7) { // Summer
    return "Perfect weather for test drives";
  } else if (month === 8 || month === 9) { // Fall
    return "Fall into savings before winter arrives";
  } else if (month === 10) { // November (Black Friday season)
    return "Black Friday deals extended to our lot";
  }

  return null;
};
