const DISCORD_USER_ID = "983752650627620944";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const token = Deno.env.get("DISCORD_BOT_TOKEN");

    if (!token) {
      throw new Error(
        "DISCORD_BOT_TOKEN is not configured"
      );
    }

    const response = await fetch(
      `https://discord.com/api/v10/users/${DISCORD_USER_ID}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      }
    );

    if (!response.ok) {
      const body = await response.text();

      console.error(
        "Discord API error:",
        response.status,
        body
      );

      return new Response(
        JSON.stringify({
          error: "Discord API request failed",
          status: response.status,
        }),
        {
          status: 502,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const user = await response.json();

    let avatarUrl = null;

    if (user.avatar) {
      const animated =
        user.avatar.startsWith("a_");

      const extension = animated
        ? "gif"
        : "webp";

      avatarUrl =
        `https://cdn.discordapp.com/avatars/` +
        `${user.id}/${user.avatar}.${extension}` +
        `?size=256`;
    }

    let bannerUrl = null;

    if (user.banner) {
      const animated =
        user.banner.startsWith("a_");

      const extension = animated
        ? "gif"
        : "webp";

      bannerUrl =
        `https://cdn.discordapp.com/banners/` +
        `${user.id}/${user.banner}.${extension}` +
        `?size=600`;
    }

    const result = {
      id: user.id,
      username: user.username,
      displayName:
        user.global_name ?? user.username,
      avatarUrl,
      bannerUrl,
      accentColor:
        user.accent_color ?? null,
    };

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",

          // Recheck Discord periodically rather than
          // permanently caching the profile.
          "Cache-Control":
            "public, max-age=60, s-maxage=300",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Could not load Discord profile",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
