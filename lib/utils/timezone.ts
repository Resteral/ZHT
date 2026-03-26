export const formatDateEST = (date: string | Date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj)
}

export const formatTimeEST = (date: string | Date) => {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(dateObj)
}

export const getCurrentESTTime = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  })
}
