export default function LezionePage({
  params,
}: {
  params: { lezione: string };
}) {
  return <h1>Lezione: {params.lezione}</h1>;
}
