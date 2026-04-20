# CP Sensei

I built this because I kept losing my flow switching between a problem and ChatGPT. By the time I explained my approach and got a response, my train of thought was gone. This extension fixes that.

## What it does

Sits on LeetCode, Codeforces and GeeksForGeeks. When you're stuck, hit Get Hint — it starts small (just the topic/algorithm) and goes deeper each time you press +, up to a full solution. After a submission it picks up the verdict, and if you get a WA or TLE it tells you where to look. Analyze button breaks down your code's complexity, bugs and a failing test case. Over time it builds a picture of how you code and adjusts hints to match.

There's also a small Node script in `/pa` that watches for upcoming contests on both platforms and emails you 30 min before they start.

## Stack

Chrome MV3, Shadow DOM, MutationObserver, Claude API (Haiku), Puppeteer, Nodemailer

## Getting started

**Extension**
1. `chrome://extensions` → Developer Mode → Load Unpacked → point to this folder
2. Open any problem on LC, CF or GFG
3. First time you hit Get Hint it'll ask for your Anthropic API key — paste it, done

**Contest alerts**
1. `cd pa && npm install`
2. Copy `.env.example` → `.env` and fill in your cookies, handles and email details
3. `node index.js`

Session cookies expire every few weeks — just grab fresh ones from DevTools when alerts stop coming.
