import Image from "next/image";

// Original asset supplied by Yahoo's public developer attribution requirements.
export function YahooAttribution() {
  return <p className="muted"><a href="https://fantasy.yahoo.com/" target="_blank" rel="noopener noreferrer"><Image src="/yahoo-fantasy.svg" width={40} height={40} alt="Yahoo Fantasy" unoptimized style={{verticalAlign: "middle", marginRight: 8}}/>Fantasy data provided by Yahoo Fantasy</a>. Yahoo does not endorse FantasyNextMove.</p>;
}
