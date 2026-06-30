export function buildGoogleFlightsUrl(
  from: string,
  to: string,
  date?: string,
  returnDate?: string
): string {
  const origin = encodeURIComponent(from.trim().toUpperCase())
  const dest = encodeURIComponent(to.trim().toUpperCase())
  let url = `https://www.google.com/flights?q=flights+from+${origin}+to+${dest}`
  if (date) {
    url += `+on+${encodeURIComponent(date.trim().split("T")[0])}`
  }
  if (returnDate) {
    url += `+return+${encodeURIComponent(returnDate.trim().split("T")[0])}`
  }
  return url
}
