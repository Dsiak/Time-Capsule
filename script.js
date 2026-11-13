
"use strict";

// ==================================================
// 1. CONFIGURATION
// ==================================================

const CONFIG = {
    ville: "Moncton",
    latitude: 46.0995,
    longitude: -64.7998,
    timezone: "America/Moncton",
    paysEconomie: "CAN",
    delaiRequete: 16000
};

// Récupération des éléments HTML.
const bouton = document.getElementById("bouton");
const results = document.getElementById("results");
const dateInput = document.querySelector('input[type="date"]');

// Identifiant permettant d'ignorer les anciennes recherches.
let rechercheCourante = 0;

if (!bouton || !results || !dateInput) {
    console.error(
        "HTML requis : #bouton, #results et input[type=date]."
    );
} else {
    bouton.addEventListener("click", loadCapsule);
}


// ==================================================
// 2. FONCTIONS UTILITAIRES
// ==================================================

// Évite qu'une réponse API soit interprétée
// comme du code HTML dangereux.
function echapper(valeur) {
    return String(valeur ?? "").replace(
        /[&<>"']/g,
        lettre => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[lettre]
    );
}

// Génère un lien HTML sécurisé.
function lienSur(url, titre = "Source") {
    try {
        const adresse = new URL(url);

        if (adresse.protocol !== "https:") {
            return "";
        }

        return `
            <a
                href="${echapper(adresse.href)}"
                target="_blank"
                rel="noopener noreferrer"
            >
                ${echapper(titre)} ↗
            </a>
        `;
    } catch {
        return "";
    }
}

// Transforme le HTML d'une API en texte ordinaire.
function texteHTML(html) {
    return new DOMParser()
        .parseFromString(html || "", "text/html")
        .body.textContent
        .replace(/\s+/g, " ")
        .trim();
}

// Génère une liste HTML.
function listeHTML(elements) {
    if (!elements.length) {
        return "<p>No information found.</p>";
    }

    return `
        <ul>
            ${elements.map(
                element => `<li>${element}</li>`
            ).join("")}
        </ul>
    `;
}

// Formate les nombres.
function nombre(valeur, options = {}) {
    return new Intl.NumberFormat(
        "en-CA",
        options
    ).format(valeur);
}


// ==================================================
// 3. REQUÊTES API
// ==================================================

// Centralise les requêtes HTTP.
// Vérifie les erreurs, limite le temps d'attente
// et convertit automatiquement la réponse en JSON.
async function json(url, options = {}) {
    const controleur = new AbortController();

    const minuterie = setTimeout(
        () => controleur.abort(),
        CONFIG.delaiRequete
    );

    try {
        const reponse = await fetch(url, {
            ...options,
            signal: controleur.signal,
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        });

        if (!reponse.ok) {
            // Fonctionne avec les URL complètes
            // et les URL relatives comme /api/tmdb.
            const adresse = new URL(
                url,
                window.location.href
            );

            throw new Error(
                `HTTP ${reponse.status} — ${adresse.hostname}`
            );
        }

        return await reponse.json();

    } finally {
        clearTimeout(minuterie);
    }
}


// ==================================================
// 4. WIKIPEDIA
// ==================================================

// Récupère les événements, naissances et décès
// associés à un jour et un mois.
function wikipediaJour(mois, jour) {
    return json(
        `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${mois}/${jour}`
    );
}

// Récupère le contenu HTML d'une page Wikipedia.
async function pageWikipedia(titre) {
    const params = new URLSearchParams({
        action: "parse",
        page: titre,
        prop: "text",
        format: "json",
        origin: "*"
    });

    const data = await json(
        `https://en.wikipedia.org/w/api.php?${params}`
    );

    if (data.error) {
        return null;
    }

    const html = data.parse?.text?.["*"];

    if (!html) {
        return null;
    }

    return new DOMParser().parseFromString(
        html,
        "text/html"
    );
}

// Construit une URL Wikipedia.
function wikiURL(titre) {
    return (
        "https://en.wikipedia.org/wiki/" +
        encodeURIComponent(
            titre.replaceAll(" ", "_")
        )
    );
}


// ==================================================
// 5. FONCTION PRINCIPALE
// ==================================================

async function loadCapsule() {
    const date = dateInput.value;

    // Vérification du format.
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!match) {
        alert("Please choose a valid date.");
        return;
    }

    const [, annee, mois, jour] = match;

    const test = new Date(`${date}T12:00:00Z`);

    // Vérification de l'existence de la date.
    if (
        Number.isNaN(test.getTime()) ||
        test.toISOString().slice(0, 10) !== date
    ) {
        alert("This date does not exist.");
        return;
    }

    // Les dates futures sont interdites.
    if (
        date > new Date().toISOString().slice(0, 10)
    ) {
        alert(
            "Please choose today or a date in the past."
        );
        return;
    }

    // Identifiant de la recherche actuelle.
    const idRecherche = ++rechercheCourante;

    // Informations partagées entre les rubriques.
    const contexte = {
        date,
        annee,
        mois,
        jour,
        historique: wikipediaJour(mois, jour)
    };

    // Affichage de la date en anglais.
    const titreDate = test.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: "UTC"
        }
    );

    // ==========================================
    // LES 17 RUBRIQUES
    // ==========================================

    const rubriques = [
        [
            "news",
            "📰 World Headlines",
            () => getActualites(contexte)
        ],
        [
            "events",
            "📜 On This Day",
            () => getEvenements(contexte)
        ],
        [
            "births",
            "🎂 Famous Birthdays",
            () => getNaissances(contexte)
        ],
        [
            "deaths",
            "🕯️ Notable Deaths",
            () => getDeces(contexte)
        ],
        [
            "movies",
            "🎬 Movies Released So Far",
            () => getFilms(contexte)
        ],
        [
            "tv",
            "📺 TV Series Debuting So Far",
            () => getSeries(contexte)
        ],
        [
            "music",
            "🎵 Billboard Year-End Hits",
            () => getMusique(contexte)
        ],
        [
            "books",
            "📚 Books Published This Year",
            () => getLivres(contexte)
        ],
        [
            "games",
            "🎮 Video Games",
            () => getJeux(contexte)
        ],
        [
            "nasa",
            "🚀 NASA Astronomy Picture",
            () => getNASA(contexte)
        ],
        [
            "weather",
            `☀️ Weather in ${CONFIG.ville}`,
            () => getMeteo(contexte)
        ],
        [
            "population",
            "🌍 World Population",
            () => getPopulation(contexte)
        ],
        [
            "economy",
            "💰 Cost-of-Living Indicators",
            () => getEconomie(contexte)
        ],
        [
            "currency",
            "💱 Historical USD/CAD Exchange Rate",
            () => getChange(contexte)
        ],
        [
            "sports",
            "🏆 Sports Champions & Highlights",
            () => getSports(contexte)
        ],
        [
            "science",
            "🔬 Science Discoveries",
            () => getPageAnnee(contexte, "science")
        ],
        [
            "tech",
            "💻 Technology of the Era",
            () => getTechnologie(contexte)
        ]
    ];

    // ==========================================
    // CRÉATION DES CARTES HTML
    // ==========================================

    results.innerHTML = `
        <h2>
            🕰️ Time Capsule — ${echapper(titreDate)}
        </h2>

        <p class="intro">
            Travel back in time and discover
            what the world was like.
        </p>

        <div class="capsule-grid">
            ${rubriques.map(
                ([id, titre]) => `
                    <section
                        class="capsule-card"
                        id="tc-${id}"
                    >
                        <h3>${titre}</h3>
                        <p class="chargement">
                            Loading...
                        </p>
                    </section>
                `
            ).join("")}
        </div>
    `;

    // ==========================================
    // CHARGEMENT INDÉPENDANT
    // ==========================================

    // Toutes les rubriques se chargent en parallèle.
    // Si une API échoue, les autres continuent.

    await Promise.all(
        rubriques.map(
            async ([id, titre, charger]) => {
                const section = document.getElementById(
                    `tc-${id}`
                );

                try {
                    const contenu = await charger();

                    // Ignore les réponses d'une ancienne recherche.
                    if (idRecherche !== rechercheCourante) {
                        return;
                    }

                    section.innerHTML = `
                        <h3>${titre}</h3>
                        ${contenu}
                    `;

                } catch (erreur) {
                    console.error(
                        `[Time Capsule / ${id}]`,
                        erreur
                    );

                    if (idRecherche !== rechercheCourante) {
                        return;
                    }

                    section.innerHTML = `
                        <h3>${titre}</h3>
                        <p>
                            ⚠️ Data unavailable.
                            Try again later.
                        </p>
                    `;
                }
            }
        )
    );
}


// ==================================================
// 6. ÉVÉNEMENTS HISTORIQUES
// ==================================================

// Récupère les événements historiques du jour.
// Exclut les événements postérieurs à la date choisie.
async function elementsHistoire(ctx, categorie) {
    const data = await ctx.historique;

    const elements = (data[categorie] || [])
        .filter(
            element =>
                Number(element.year) <= Number(ctx.annee) &&
                element.text
        )
        .sort(
            (a, b) =>
                Number(b.year) - Number(a.year)
        )
        .slice(0, 5);

    return listeHTML(
        elements.map(
            element => `
                <strong>
                    ${echapper(element.year)}
                </strong>
                —
                ${echapper(element.text)}
            `
        )
    ) + `
        <small>
            Historical anniversaries.
            ${lienSur(
                "https://en.wikipedia.org/wiki/Main_Page",
                "Wikipedia"
            )}
        </small>
    `;
}

// Événements historiques.
function getEvenements(ctx) {
    return elementsHistoire(ctx, "events");
}

// Naissances célèbres.
function getNaissances(ctx) {
    return elementsHistoire(ctx, "births");
}

// Décès célèbres.
function getDeces(ctx) {
    return elementsHistoire(ctx, "deaths");
}


// ==================================================
// 7. ACTUALITÉS HISTORIQUES
// ==================================================

async function getActualites(ctx) {
    const mois = new Date(
        `${ctx.date}T12:00:00Z`
    ).toLocaleString(
        "en-US",
        {
            month: "long",
            timeZone: "UTC"
        }
    );

    // Exemple : Portal:Current_events/2020_March_15
    const page =
        `Portal:Current_events/` +
        `${ctx.annee}_${mois}_${Number(ctx.jour)}`;

    const documentWiki = await pageWikipedia(page);

    if (!documentWiki) {
        return `
            <p>No daily archive for this date.</p>
            ${lienSur(wikiURL(page))}
        `;
    }

    const zone =
        documentWiki.querySelector(
            ".current-events-content"
        ) ||
        documentWiki.querySelector(
            ".mw-parser-output"
        ) ||
        documentWiki.body;

    // Extraction des articles.
    const actualites = [...zone.querySelectorAll("li")]
        .filter(li => !li.querySelector("li"))
        .map(
            li => li.textContent
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter(
            texte =>
                texte.length >= 65 &&
                texte.length <= 550
        )
        .slice(0, 4);

    return (
        listeHTML(
            actualites.map(texte => echapper(texte))
        ) +
        lienSur(
            wikiURL(page),
            "Daily News Archive"
        )
    );
}


// ==================================================
// 8. TMDB — FILMS ET SÉRIES
// ==================================================

// IMPORTANT :
// La clé API TMDB n'est plus dans ce fichier.
//
// Le navigateur contacte notre fonction Cloudflare
// à l'adresse /api/tmdb.
//
// La fonction Cloudflare utilise la clé secrète,
// interroge TMDB et renvoie seulement les résultats.
//
// Elle gère également la deuxième recherche
// lorsqu'aucun film ou série n'est trouvé.

async function getTMDB(ctx, type) {

    // Préparation des paramètres envoyés au backend.
    const params = new URLSearchParams({
        type: type,
        date: ctx.date
    });

    // Appel sécurisé à notre fonction Cloudflare.
    // Aucun identifiant secret n'est envoyé.
    const data = await json(
        `/api/tmdb?${params}`
    );

    // Préparation des cinq premiers résultats.
    const elements = (data.results || [])
        .slice(0, 5)
        .map(item => {

            const titre =
                item.title ||
                item.name ||
                "Untitled";

            // Affichage de la note.
            const note = item.vote_count
                ? `${Number(item.vote_average).toFixed(1)}/10`
                : "Not rated";

            // Affichage de l'affiche.
            const affiche = item.poster_path
                ? `
                    <img
                        src="https://image.tmdb.org/t/p/w185${echapper(item.poster_path)}"
                        alt="${echapper(titre)} poster"
                        loading="lazy"
                        width="80"
                    >
                `
                : "";

            return `
                <div class="capsule-media">
                    ${affiche}

                    <p>
                        <strong>
                            ${echapper(titre)}
                        </strong>

                        <br>

                        ${echapper(note)}
                    </p>
                </div>
            `;
        });

    return (
        elements.join("") ||
        "<p>No titles found.</p>"
    ) + `
        <small>
            Ratings are based on current TMDB votes,
            not historical ratings.

            ${lienSur(
                "https://www.themoviedb.org/",
                "TMDB"
            )}
        </small>
    `;
}

// Films.
function getFilms(ctx) {
    return getTMDB(ctx, "movie");
}

// Séries télévisées.
function getSeries(ctx) {
    return getTMDB(ctx, "tv");
}


// ==================================================
// 9. MUSIQUE — BILLBOARD
// ==================================================

async function getMusique(ctx) {
    const annee = Number(ctx.annee);

    // Billboard Year-End Hot 100 commence en 1959.
    if (annee < 1959) {
        return `
            <p>
                Year-end Hot 100 charts are
                unavailable for this period.
            </p>
        `;
    }

    // Pas de classement annuel complet
    // pour l'année en cours.
    if (annee === new Date().getFullYear()) {
        return `
            <p>
                The complete year-end chart
                has not been released yet.
            </p>
        `;
    }

    const page =
        `Billboard Year-End Hot 100 singles of ${annee}`;

    const documentWiki = await pageWikipedia(page);

    if (!documentWiki) {
        return `
            <p>Chart not found.</p>
            ${lienSur(wikiURL(page))}
        `;
    }

    let chansons = [];

    // Recherche d'un tableau contenant les classements.
    for (
        const tableau of documentWiki.querySelectorAll(
            "table.wikitable"
        )
    ) {
        const lignes = [...tableau.querySelectorAll("tr")]
            .map(ligne => {

                const cellules = [...ligne.children]
                    .filter(
                        cellule =>
                            /^(TH|TD)$/.test(
                                cellule.tagName
                            )
                    );

                if (cellules.length < 3) {
                    return null;
                }

                const rang = Number(
                    cellules[0].textContent.trim()
                );

                if (
                    !Number.isInteger(rang) ||
                    rang < 1 ||
                    rang > 100
                ) {
                    return null;
                }

                return {
                    rang,
                    titre: cellules[1].textContent.trim(),
                    artiste: cellules[2].textContent.trim()
                };
            })
            .filter(Boolean);

        // Vérification des cinq premières positions.
        if (
            [1, 2, 3, 4, 5].every(
                rang => lignes.some(
                    chanson => chanson.rang === rang
                )
            )
        ) {
            chansons = lignes
                .sort((a, b) => a.rang - b.rang)
                .slice(0, 5);

            break;
        }
    }

    return listeHTML(
        chansons.map(
            chanson => `
                <strong>
                    ${echapper(chanson.titre)}
                </strong>
                —
                ${echapper(chanson.artiste)}
            `
        )
    ) + `
        <small>
            U.S. year-end chart.
            Retrospective data may include songs
            released after the selected date.
        </small>

        <br>

        ${lienSur(
            wikiURL(page),
            "Billboard Chart"
        )}
    `;
}


// ==================================================
// 10. LIVRES — OPEN LIBRARY
// ==================================================

async function getLivres(ctx) {

    const params = new URLSearchParams({
        q: `first_publish_year:${ctx.annee}`,
        fields:
            "key,title,author_name,cover_i,first_publish_year,edition_count",
        limit: "35"
    });

    const data = await json(
        `https://openlibrary.org/search.json?${params}`
    );

    // Sélection de cinq livres.
    // Il ne s'agit pas forcément de best-sellers.
    const livres = (data.docs || [])
        .filter(
            livre =>
                livre.first_publish_year ===
                Number(ctx.annee)
        )
        .sort(
            (a, b) =>
                (b.edition_count || 0) -
                (a.edition_count || 0)
        )
        .slice(0, 5);

    const html = livres.map(livre => {

        const couverture = livre.cover_i
            ? `
                <img
                    src="https://covers.openlibrary.org/b/id/${Number(livre.cover_i)}-S.jpg"
                    width="55"
                    loading="lazy"
                    alt="Book cover"
                >
            `
            : "";

        return `
            <div class="capsule-media">
                ${couverture}

                <p>
                    <strong>
                        ${echapper(livre.title)}
                    </strong>

                    <br>

                    ${echapper(
                        livre.author_name?.[0] ||
                        "Unknown author"
                    )}
                </p>
            </div>
        `;
    }).join("");

    return (
        html ||
        "<p>No books found.</p>"
    ) + `
        <small>
            Sample of catalogued books,
            not a historical bestseller ranking.

            ${lienSur(
                "https://openlibrary.org",
                "Open Library"
            )}
        </small>
    `;
}


// ==================================================
// 11. JEUX VIDÉO
// ==================================================

// Utilisation des archives Wikipedia.
// Une intégration RAWG pourra être ajoutée plus tard.
async function getJeux(ctx) {
    return getPageAnnee(
        ctx,
        "video games",
        "RAWG key optional for dated game releases."
    );
}


// ==================================================
// 12. NASA — IMAGE ASTRONOMIQUE
// ==================================================

async function getNASA(ctx) {

    // Date de début des archives APOD.
    if (ctx.date < "1995-06-16") {
        return `
            <p>
                NASA's APOD archive begins
                June 16, 1995.
            </p>
        `;
    }

    // Format utilisé : YYMMDD.
    const code =
        ctx.annee.slice(2) +
        ctx.mois +
        ctx.jour;

    // API NASA WordPress.
    const data = await json(
        `https://science.nasa.gov/wp-json/wp/v2/apod-basic/${code}`
    );

    // Certaines publications sont des vidéos.
    const image = (
        data.media_type === "image" &&
        data.hdurl
    )
        ? `
            <img
                class="capsule-large"
                src="${echapper(data.hdurl)}"
                alt="${echapper(
                    data.title ||
                    "Astronomy image"
                )}"
                loading="lazy"
            >
        `
        : `
            <p>
                This day's APOD is a video
                or has no image preview.
            </p>
        `;

    // Limitation de la description à 450 caractères.
    const description = texteHTML(
        data.explanation
    ).slice(0, 450);

    return `
        <p>
            <strong>
                ${echapper(
                    data.title ||
                    "Astronomy Picture of the Day"
                )}
            </strong>
        </p>

        ${image}

        <p>
            ${echapper(description)}
            ${description.length >= 450 ? "…" : ""}
        </p>

        ${lienSur(
            data.permalink ||
            data.url ||
            "https://apod.nasa.gov/",
            "NASA APOD"
        )}
    `;
}


// ==================================================
// 13. MÉTÉO HISTORIQUE
// ==================================================

async function getMeteo(ctx) {

    // Les archives ERA5 commencent en 1940.
    if (ctx.date < "1940-01-01") {
        return `
            <p>
                ERA5 historical data starts
                in 1940.
            </p>
        `;
    }

    // Délai de publication des archives.
    const limite = new Date();

    limite.setUTCDate(
        limite.getUTCDate() - 6
    );

    if (
        ctx.date >
        limite.toISOString().slice(0, 10)
    ) {
        return `
            <p>
                Historical weather is not
                published yet for this date.
            </p>
        `;
    }

    const params = new URLSearchParams({
        latitude: CONFIG.latitude,
        longitude: CONFIG.longitude,
        start_date: ctx.date,
        end_date: ctx.date,
        daily:
            "temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum",
        timezone: CONFIG.timezone,
        models: "era5"
    });

    const reponse = await json(
        `https://archive-api.open-meteo.com/v1/archive?${params}`
    );

    const data = reponse.daily;

    if (!data?.time?.length) {
        return "<p>Weather unavailable.</p>";
    }

    // Lecture d'une mesure météorologique.
    const valeur = (cle, unite) => {
        if (data[cle]?.[0] == null) {
            return "N/A";
        }

        return `${data[cle][0]} ${unite}`;
    };

    return `
        <p>
            🌡️ High:
            ${valeur("temperature_2m_max", "°C")}
        </p>

        <p>
            🥶 Low:
            ${valeur("temperature_2m_min", "°C")}
        </p>

        <p>
            🌧️ Precipitation:
            ${valeur("precipitation_sum", "mm")}
        </p>

        <p>
            ❄️ Snowfall:
            ${valeur("snowfall_sum", "cm")}
        </p>

        <small>
            ERA5 reanalysis estimate,
            not an exact station observation.

            ${lienSur(
                "https://open-meteo.com/en/docs/historical-weather-api",
                "Open-Meteo"
            )}
        </small>
    `;
}


// ==================================================
// 14. WORLD BANK — FONCTION COMMUNE
// ==================================================

// Récupère un indicateur économique
// pour une année et un pays.
async function banqueMondiale(
    pays,
    indicateur,
    annee
) {
    const url =
        `https://api.worldbank.org/v2/country/${pays}/indicator/${indicateur}` +
        `?format=json&date=${annee}`;

    const data = await json(url);

    const element = data?.[1]?.find(
        item =>
            item.date === annee &&
            item.value != null
    );

    return element?.value ?? null;
}


// ==================================================
// 15. POPULATION MONDIALE
// ==================================================

async function getPopulation(ctx) {

    // SP.POP.TOTL = population totale.
    const valeur = await banqueMondiale(
        "WLD",
        "SP.POP.TOTL",
        ctx.annee
    );

    if (valeur == null) {
        return `
            <p>
                Not available for this year.
            </p>
        `;
    }

    return `
        <p>
            <strong>
                ${nombre(valeur)}
            </strong>
            people
        </p>

        <small>
            Annual population estimate.

            ${lienSur(
                "https://data.worldbank.org/indicator/SP.POP.TOTL",
                "World Bank"
            )}
        </small>
    `;
}


// ==================================================
// 16. ÉCONOMIE ET COÛT DE LA VIE
// ==================================================

async function getEconomie(ctx) {

    // Trois indicateurs :
    //
    // FP.CPI.TOTL.ZG  : inflation annuelle.
    // FP.CPI.TOTL     : indice des prix.
    // NY.GDP.PCAP.CD  : PIB par habitant.
    //
    // Attention :
    // Ces indicateurs ne représentent pas
    // directement le prix des produits.

    const valeurs = await Promise.allSettled([
        banqueMondiale(
            CONFIG.paysEconomie,
            "FP.CPI.TOTL.ZG",
            ctx.annee
        ),
        banqueMondiale(
            CONFIG.paysEconomie,
            "FP.CPI.TOTL",
            ctx.annee
        ),
        banqueMondiale(
            CONFIG.paysEconomie,
            "NY.GDP.PCAP.CD",
            ctx.annee
        )
    ]);

    // Renvoie null si un indicateur a échoué.
    const valeur = index => {
        if (valeurs[index].status !== "fulfilled") {
            return null;
        }

        return valeurs[index].value;
    };

    // Formate un indicateur.
    const affichage = (v, suffixe) => {
        if (v == null) {
            return "N/A";
        }

        return nombre(
            v,
            {
                maximumFractionDigits: 2
            }
        ) + suffixe;
    };

    return `
        <p>
            📈 Annual Inflation:
            ${affichage(valeur(0), "%")}
        </p>

        <p>
            🛒 Consumer Price Index:
            ${affichage(valeur(1), "")}
        </p>

        <p>
            💵 GDP Per Capita:
            ${affichage(valeur(2), " USD")}
        </p>

        <small>
            Country: Canada.

            CPI is an index, not the price
            of a shopping basket.

            GDP is not an individual salary.

            ${lienSur(
                "https://data.worldbank.org/country/canada",
                "World Bank"
            )}
        </small>
    `;
}


// ==================================================
// 17. TAUX DE CHANGE HISTORIQUE
// ==================================================

async function getChange(ctx) {

    // Historique disponible à partir de 1999.
    if (ctx.date < "1999-01-04") {
        return `
            <p>
                USD/CAD exchange-rate history
                is unavailable for this period
                from this provider.
            </p>
        `;
    }

    const data = await json(
        `https://api.frankfurter.dev/v1/${ctx.date}?base=USD&symbols=CAD`
    );

    const taux = data.rates?.CAD;

    if (!taux) {
        return `
            <p>
                No exchange-rate data found.
            </p>
        `;
    }

    return `
        <p>
            <strong>
                1 USD =
                ${nombre(
                    taux,
                    {
                        maximumFractionDigits: 4
                    }
                )}
                CAD
            </strong>
        </p>

        <small>
            Reference rate dated
            ${echapper(data.date)}.

            On non-business days, the rate
            may be from an earlier business day.

            ${lienSur(
                "https://frankfurter.dev",
                "Frankfurter"
            )}
        </small>
    `;
}


// ==================================================
// 18. ARCHIVES ANNUELLES WIKIPEDIA
// ==================================================

// Fonction utilisée pour explorer les archives
// scientifiques et les jeux vidéo d'une année.
async function getPageAnnee(
    ctx,
    sujet,
    note = ""
) {
    const page = `${ctx.annee} in ${sujet}`;

    const doc = await pageWikipedia(page);

    if (!doc) {
        return `
            <p>
                No structured archive
                found for this year.
            </p>

            ${lienSur(
                wikiURL(page),
                "Read More"
            )}
        `;
    }

    const zone =
        doc.querySelector(".mw-parser-output") ||
        doc.body;

    // Extraction de paragraphes informatifs.
    const paragraphes = [...zone.querySelectorAll("p")]
        .map(
            p => p.textContent
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter(
            texte =>
                texte.length >= 80 &&
                texte.length <= 1800
        );

    const resume = paragraphes[0]?.slice(0, 550);

    const contenu = resume
        ? `
            <p>
                ${echapper(resume)}
                ${resume.length === 550 ? "…" : ""}
            </p>
        `
        : `
            <p>
                Browse the yearly archive
                for details.
            </p>
        `;

    return contenu + `
        <small>
            Retrospective of ${echapper(ctx.annee)}.

            Events may have occurred after
            the selected date.

            ${echapper(note)}
        </small>

        <br>

        ${lienSur(
            wikiURL(page),
            `Explore ${sujet} in ${ctx.annee}`
        )}
    `;
}


// ==================================================
// 19. TECHNOLOGIE
// ==================================================

// Recherche des événements technologiques
// dans différentes archives Wikipedia.
async function getTechnologie(ctx) {

    const titres = [
        `${ctx.annee} in computing`,
        `${ctx.annee} in technology`,
        `${ctx.annee} in science`
    ];

    for (const titre of titres) {

        const doc = await pageWikipedia(titre);

        if (!doc) {
            continue;
        }

        const zone =
            doc.querySelector(".mw-parser-output") ||
            doc.body;

        // Recherche d'événements informatiques,
        // scientifiques et technologiques.
        const sujets = [...zone.querySelectorAll("li")]
            .filter(
                li => !li.querySelector("li")
            )
            .map(
                li => li.textContent
                    .replace(/\s+/g, " ")
                    .trim()
            )
            .filter(
                texte =>
                    texte.length >= 50 &&
                    texte.length <= 300
            )
            .filter(
                texte =>
                    /computer|software|artificial intelligence|internet|chip|robot|quantum|technology|digital|satellite|spacecraft/i.test(
                        texte
                    )
            )
            .slice(0, 4);

        if (sujets.length) {
            return listeHTML(
                sujets.map(texte => echapper(texte))
            ) + `
                <small>
                    Year-wide retrospective.

                    Events may have occurred
                    after the selected date.

                    ${lienSur(
                        wikiURL(titre),
                        "Wikipedia"
                    )}
                </small>
            `;
        }
    }

    return `
        <p>
            No reliable technology
            highlights found for this year.
        </p>
    `;
}


// ==================================================
// 20. SPORT
// ==================================================

// Recherche de résultats sportifs associés
// à une année.
//
// Cette méthode utilise les archives Wikipedia.
// Les résultats sont approximatifs.
async function getSports(ctx) {

    const page = `${ctx.annee} in sports`;

    const doc = await pageWikipedia(page);

    if (!doc) {
        return `
            <p>
                No sports archive found.
            </p>

            ${lienSur(wikiURL(page))}
        `;
    }

    const zone =
        doc.querySelector(".mw-parser-output") ||
        doc.body;

    // Recherche des événements qui mentionnent
    // une victoire ou un championnat.
    const faits = [...zone.querySelectorAll("li")]
        .filter(
            li => !li.querySelector("li")
        )
        .map(
            li => li.textContent
                .replace(/\s+/g, " ")
                .trim()
        )
        .filter(
            texte =>
                texte.length >= 45 &&
                texte.length <= 300
        )
        .filter(
            texte =>
                /\b(won|winner|champion|defeated|gold medal|super bowl)\b/i.test(
                    texte
                )
        )
        .slice(0, 4);

    return listeHTML(
        faits.map(texte => echapper(texte))
    ) + `
        <small>
            Selected winners and records
            from the full year.

            Events may have occurred
            after the chosen date.

            ${lienSur(
                wikiURL(page),
                "Year in Sports"
            )}
        </small>
    `;
} 