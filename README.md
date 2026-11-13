 # 🕰️ Time Capsule

**Travel through time and discover what the world was like on any given date.**

Time Capsule is an interactive web application that allows users to explore historical events, entertainment, scientific discoveries, and economic information from different periods.

By selecting a date, users can discover what was happening around the world at that time.

## ✨ Features

Time Capsule offers 17 categories of historical information:

| Category | Description |
|---|---|
| 📰 World Headlines | Explore archived news from the selected date. |
| 📜 Historical Events | Discover important historical events. |
| 🎂 Famous Birthdays | Find notable people born on that day. |
| 🕯️ Notable Deaths | Explore historical figures who passed away. |
| 🎬 Movies | Discover movies released by the selected date. |
| 📺 TV Series | Explore television series from the selected period. |
| 🎵 Music | Discover Billboard year-end hits. |
| 📚 Books | Explore books published during the selected year. |
| 🎮 Video Games | Discover video game history. |
| 🚀 NASA | Explore NASA's Astronomy Picture of the Day. |
| ☀️ Weather | View historical weather data for Moncton, Canada. |
| 🌍 Population | Explore historical world population estimates. |
| 💰 Economy | Examine inflation and economic indicators. |
| 💱 Exchange Rates | Explore historical USD/CAD exchange rates. |
| 🏆 Sports | Discover sporting achievements and champions. |
| 🔬 Science | Explore scientific discoveries. |
| 💻 Technology | Discover technological developments. |

## 🛠️ Technologies

**Frontend**
- HTML5
- CSS3
- JavaScript (ES6+)

**Backend**
- Cloudflare Pages Functions

**Version Control**
- Git
- GitHub

## 🌐 Data Sources

Time Capsule integrates several external data sources:

- Wikipedia and Wikimedia APIs
- The Movie Database (TMDB)
- Open Library
- NASA
- Open-Meteo
- World Bank
- Frankfurter API

Data availability varies by date and provider. Some categories display retrospective information for an entire year rather than information known on the exact selected date.

## 🔐 API Security

TMDB requests are handled through a Cloudflare Pages Function.

The TMDB API key is stored as a server-side environment secret and is not included in the public frontend source code.

## 🚀 Getting Started

### Prerequisites

- A modern web browser
- A Cloudflare account for deployment
- A TMDB API credential

### Installation

1. Clone the repository.
2. Open the project folder in VS Code.
3. Configure the `TMDB_API_KEY` secret in your Cloudflare environment.
4. Deploy the project using Cloudflare Pages.

The frontend can be viewed locally, but TMDB features require the Cloudflare function to be running.

## 📁 Project Structure

```text
Time-Capsule/
│
├── index.html
├── style.css
├── script.js
├── README.md
├── .gitignore
│
└── functions/
    └── api/
        └── tmdb.js
```

## 🔮 Future Improvements

- Add more historical data sources.
- Improve historical video game information.
- Introduce interactive timelines.
- Add more cities for historical weather.
- Improve mobile responsiveness.
- Add additional filters and search options.

## 👨‍💻 Author

**Drissa Siaka Coulibaly**

Applied Computer Science Student  
Université de Moncton, Canada

## 📄 License

No open-source license has been selected yet.