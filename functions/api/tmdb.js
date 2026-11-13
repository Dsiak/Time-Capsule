// Cloudflare Pages Function
// Securely retrieves movies and TV shows from TMDB.

export async function onRequestGet(context) {

    // Read the TMDB API key from Cloudflare's environment.
    // This key is never sent to the browser.
    const apiKey = context.env.TMDB_API_KEY;

    if (!apiKey) {
        return Response.json(
            { error: "TMDB API key is not configured." },
            { status: 500 }
        );
    }

    // Read the parameters sent by the website.
    const url = new URL(context.request.url);

    const type = url.searchParams.get("type");
    const date = url.searchParams.get("date");

    // Only allow movies and TV series.
    if (!["movie", "tv"].includes(type)) {
        return Response.json(
            { error: "Invalid media type." },
            { status: 400 }
        );
    }

    // Validate the requested date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
        return Response.json(
            { error: "Invalid date." },
            { status: 400 }
        );
    }

    const selectedDate = new Date(`${date}T12:00:00Z`);

    if (
        Number.isNaN(selectedDate.getTime()) ||
        selectedDate.toISOString().slice(0, 10) !== date ||
        date > new Date().toISOString().slice(0, 10)
    ) {
        return Response.json(
            { error: "Invalid or future date." },
            { status: 400 }
        );
    }

    const year = date.slice(0, 4);

    // Build the TMDB query.
    const params = new URLSearchParams({
        api_key: apiKey,
        language: "en-US",
        include_adult: "false",
        sort_by: "vote_average.desc",
        "vote_count.gte": "100"
    });

    const dateField = type === "movie"
        ? "primary_release_date"
        : "first_air_date";

    params.set(`${dateField}.gte`, `${year}-01-01`);
    params.set(`${dateField}.lte`, date);

    try {
        const endpoint =
            `https://api.themoviedb.org/3/discover/${type}`;

        let response = await fetch(`${endpoint}?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB returned HTTP ${response.status}`);
        }

        let data = await response.json();

        // Fallback for years with few ratings.
        if (!data.results?.length) {
            params.set("vote_count.gte", "0");
            params.set("sort_by", "popularity.desc");

            response = await fetch(`${endpoint}?${params}`);

            if (!response.ok) {
                throw new Error(`TMDB returned HTTP ${response.status}`);
            }

            data = await response.json();
        }

        // Return only the data needed by the website.
        const results = (data.results || [])
            .slice(0, 5)
            .map(item => ({
                title: item.title,
                name: item.name,
                poster_path: item.poster_path,
                vote_average: item.vote_average,
                vote_count: item.vote_count
            }));

        return Response.json({ results });

    } catch (error) {
        console.error("TMDB request failed:", error.message);

        return Response.json(
            { error: "Unable to retrieve TMDB data." },
            { status: 502 }
        );
    }
}
