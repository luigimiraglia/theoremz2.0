interface RouteParams {
  lezione: string;
}

export default function LezionePage({ params }: { params: RouteParams }) {
  return <h1>Lezione: {params.lezione}</h1>;
}
