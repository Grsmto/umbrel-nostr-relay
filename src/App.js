import { useEffect, useState } from "react";

import Layout from "./components/Layout";
import Header from "./components/Header";
import Footer from "./components/Footer";

import Card from "./components/utility/Card";
import CopyText from "./components/utility/CopyText";
import ConnectClient from "./components/ConnectClient";
import TotalBackups from "./components/TotalBackups";
import LatestActions from "./components/LatestActions";
import RelaySettingsModal from "./components/RelaySettingsModal";

import { useSettingsStore } from "./services/store";

// Event kinds that we want to render in the UI
const supportedEventKinds = {
  0: {
    icon: "📝",
    name: "Profile Update",
  },
  1: {
    icon: "💭",
    name: "Post",
    showContent: true,
  },
  2: {
    icon: "📶",
    name: "Relay Update",
  },
  3: {
    icon: "🤝",
    name: "Following Update",
  },
  4: {
    icon: "🔏",
    name: "Encrypted DM",
  },
  5: {
    icon: "🗑",
    name: "Deleted Action",
  },
  6: {
    icon: "🔁",
    name: "Repost",
  },
  7: {
    icon: "🤙",
    name: "Reaction",
  },
  40: {
    icon: "🧙‍♂️",
    name: "Channel Creation",
    showContent: true,
    contentKey: "name",
  },
  41: {
    icon: "🪄",
    name: "Channel Update",
    showContent: true,
    contentKey: "name",
  },
  42: {
    icon: "📢",
    name: "Channel Message",
    showContent: true,
  },
  43: {
    icon: "🙈",
    name: "Hid Message",
  },
  44: {
    icon: "🙊",
    name: "Muted User",
  },
  22242: {
    icon: "🔓",
    name: "Authenticated Relay",
  },
  other: {
    icon: "🛠",
    name: "Other Action",
  },
};

// Total events we want to render in the activity list
const eventsToRenderLimit = 300;

const relayPort = window.location.port;

// Websocket URL of the relay
const webSocketProtocol =
  window.location.protocol === "https:" ? "wss:" : "ws:";
const webSocketRelayUrl = `${webSocketProtocol}//${window.location.hostname}:${relayPort}`;

// HTTP URL of the relay
const HttpRelayUrl = `${window.location.protocol}//${window.location.hostname}:${relayPort}`;

export default function App() {
  // State to store events from websocket
  const [events, setEvents] = useState([]);
  // State to store the connection status of websocket
  const [isConnected, setIsConnected] = useState(false);
  // State to keep track of whether all stored events have been fetched
  const [hasFetchedAllEvents, setHasFetchedAllEvents] = useState(false);
  // State to store the relay info as per NIP-11: https://github.com/nostr-protocol/nips/blob/master/11.md
  const [relayInformationDocument, setRelayInformationDocument] = useState({});

  useSettingsStore.subscribe(console.log);

  useEffect(() => {
    // Create websocket connection
    const socket = new WebSocket(webSocketRelayUrl);

    // Generate a random subscription ID
    const subscriptionID =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    // Handle websocket connection open event
    socket.onopen = () => {
      setIsConnected(true);
      // Reset events array to clear previous events
      setEvents([]);
      // Request latest 100 events
      socket.send(JSON.stringify(["REQ", subscriptionID, { limit: 1000 }]));
    };

    // Handle websocket message event
    socket.onmessage = (message) => {
      // Parse the message data
      const data = JSON.parse(message.data);

      if (!data.length) {
        console.error("Error: No data length", data);
        return;
      }

      // Check if data is End of Stored Events Notice
      // https://github.com/nostr-protocol/nips/blob/master/15.md
      if (data[0] === "EOSE") {
        setHasFetchedAllEvents(true);
        return;
      }

      // If the data is of type EVENT
      if (data[0] === "EVENT") {
        // Add the event to the events array
        setEvents((prevEvents) => {
          // Extract the relevant data from the event
          const { id, kind, created_at, content } = data[2];
          return [{ id, kind, created_at, content }, ...prevEvents];
        });
      }
    };

    // Handle websocket error
    socket.onerror = () => {
      setIsConnected(false);
    };

    // Handle websocket close
    socket.onclose = () => {
      setIsConnected(false);
    };

    // get nostr-rs-relay version
    fetch(HttpRelayUrl, {
      method: "GET",
      headers: {
        Accept: "application/nostr+json",
      },
    }).then(async (response) => {
      if (response.ok) {
        const relayInfoDoc = await response.json();
        setRelayInformationDocument(relayInfoDoc);
      }
    });

    // Cleanup function to run on component unmount
    return () => {
      // Check if the websocket is open
      if (socket.readyState === WebSocket.OPEN) {
        // Stop previous subscription and close the websocket
        socket.send(JSON.stringify(["CLOSE", subscriptionID]));
        socket.close();
      }
    };
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-4 pb-10">
        <Header isConnected={isConnected}>
          <div className="flex flex-col space-y-2 justify-center">
            <div className="relay-url-container shiny-border flex self-center after:bg-white dark:after:bg-slate-900 p-3 rounded-md after:rounded-md">
              <span className="text-sm text-slate-900 dark:text-slate-50">
                Relay URL:&nbsp;&nbsp;
              </span>
              <CopyText value={webSocketRelayUrl} />
            </div>
            <RelaySettingsModal
              openBtn={
                <button className="border border-violet-600/40 self-start bg-slate-900  hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 text-white text-sm h-11 px-3 rounded-md w-full flex items-center justify-center sm:w-auto dark:bg-violet-800 dark:highlight-white/20 dark:hover:bg-violet-600">
                  Sync to Public Relays
                </button>
              }
            />
          </div>
        </Header>

        <main className="mb-10">
          <div className="grid grid-cols-1 md:grid-cols-5 xl:grid-cols-3 gap-6 sm:gap-8">
            <Card
              className="order-last xl:order-first md:col-span-5 xl:col-span-1"
              heading="Connect your Nostr client"
            >
              <ConnectClient relayPort={relayPort} />
            </Card>

            <Card
              className="col-1 md:col-span-2 xl:col-span-1"
              heading="Total actions"
            >
              <TotalBackups
                loading={!hasFetchedAllEvents}
                events={events}
                supportedEventKinds={supportedEventKinds}
              />
            </Card>

            <Card
              className="col-1 md:col-span-3 xl:col-span-1"
              heading="Latest actions"
            >
              <LatestActions
                loading={!hasFetchedAllEvents}
                events={events}
                eventsToRenderLimit={eventsToRenderLimit}
                supportedEventKinds={supportedEventKinds}
              />
            </Card>
          </div>
        </main>

        <Footer
          leftContent={<>&copy; Umbrel 2023.</>}
          rightContent={
            <>
              Powered by{" "}
              <a
                href="https://github.com/scsibug/nostr-rs-relay"
                target="_blank"
                className="underline underline-offset-2"
                rel="noreferrer"
              >
                nostr-rs-relay
                {relayInformationDocument.version
                  ? ` ${relayInformationDocument.version}`
                  : ""}
              </a>
              .
            </>
          }
        />
      </div>
    </Layout>
  );
}
