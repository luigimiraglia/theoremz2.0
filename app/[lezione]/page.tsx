interface Props {
  params: {
    lezione: string;
  };
}

export default function LezionePage({ params }: Props) {
  return <h1>Lezione: {params.lezione}</h1>;
}
