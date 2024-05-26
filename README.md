# Custom API with Strapi

This project is a custom API built with Strapi that includes a web scraper for extracting content from various websites.

## Description

This Strapi application allows you to scrape content from websites such as CSFD.cz, MyAnimeList, and Steam. It uses Axios, JSDOM, and Cheerio for web scraping and parsing HTML content.

## Setup

### Prerequisites

- Node.js (version 18.x to 20.x)
- npm (version 6.0.0 or higher)

### Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/FoxDeFacto/StrapiCustomAPI.git
    cd custom-api-strapi
    ```

2. Install dependencies:

    ```sh
    npm install
    ```

3. Start Strapi in development mode:

    ```sh
    npm run develop
    ```

## Usage

### Starting the Server

To start the server in production mode, use:

```sh
npm start
```

### Building the Project

To build the Strapi project, use:

```sh
npm run build
```


### API Endpoints

#### Web Scraper

This endpoint allows you to scrape content from supported websites.

- **GET /web-scraper/get-content**

  Query Parameters:
  - `url` (string): The URL of the website you want to scrape.

  Example request:

  ```sh
  curl -X GET "http://localhost:1337/web-scraper/get-content?url=https://www.csfd.cz/film/12345"
  ```

### Folder Structure

- **/src/api/web-scraper/controllers**: Contains the controller for handling API requests.
- **/src/api/web-scraper/routes**: Defines the routes for the web scraper API.
- **/src/api/web-scraper/services**: Contains the service logic for web scraping.

## Author

- Ondřej Liška

## License

This project is licensed under the MIT License.