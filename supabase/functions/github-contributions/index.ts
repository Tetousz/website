const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    const githubToken =
      Deno.env.get("GITHUB_TOKEN")

    if (!githubToken) {
      throw new Error(
        "GITHUB_TOKEN is not configured"
      )
    }

    const query = `
      query {
        user(login: "Tetousz") {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  date
                  contributionCount
                  contributionLevel
                  weekday
                }
              }
            }
          }
        }
      }
    `

    const githubResponse = await fetch(
      "https://api.github.com/graphql",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${githubToken}`,
          "Content-Type":
            "application/json",
          "User-Agent":
            "Ferretusz-Website",
        },

        body: JSON.stringify({
          query,
        }),
      }
    )

    if (!githubResponse.ok) {
      throw new Error(
        `GitHub API returned ${githubResponse.status}`
      )
    }

    const githubData =
      await githubResponse.json()

    if (githubData.errors) {
      console.error(
        "GitHub GraphQL errors:",
        githubData.errors
      )

      throw new Error(
        "GitHub GraphQL request failed"
      )
    }

    const calendar =
      githubData.data
        ?.user
        ?.contributionsCollection
        ?.contributionCalendar

    if (!calendar) {
      throw new Error(
        "Contribution calendar was not returned"
      )
    }

    const days =
      calendar.weeks.flatMap(
        (week: {
          contributionDays: {
            date: string
            contributionCount: number
            contributionLevel: string
            weekday: number
          }[]
        }) =>
          week.contributionDays.map(
            (day) => ({
              date: day.date,
              count:
                day.contributionCount,
              level:
                day.contributionLevel,
              weekday:
                day.weekday,
            })
          )
      )

    return new Response(
      JSON.stringify({
        username: "Tetousz",
        total:
          calendar.totalContributions,
        days,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
          "Cache-Control":
            "public, max-age=900",
        },
      }
    )
  } catch (error) {
    console.error(error)

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
      {
        status: 500,

        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    )
  }
})