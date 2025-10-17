"use client";
import { useState } from "react";
import { CheckCircle, Circle, Lock, Trophy, Calendar } from "lucide-react";
import { motion } from "framer-motion";

// Mock data - sostituisci con dati reali da Sanity
const roadmapData = {
  "1° Quadrimestre": [
    {
      id: "numeri-naturali",
      title: "Numeri Naturali",
      type: "lesson" as const,
      status: "completed" as const,
      materia: "matematica" as const,
    },
    {
      id: "operazioni-fondamentali",
      title: "Operazioni Fondamentali",
      type: "lesson" as const,
      status: "completed" as const,
      materia: "matematica" as const,
    },
    {
      id: "potenze",
      title: "Potenze e Proprietà",
      type: "lesson" as const,
      status: "current" as const,
      materia: "matematica" as const,
    },
    {
      id: "checkpoint-1",
      title: "Checkpoint: Aritmetica di Base",
      type: "checkpoint" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
    {
      id: "grandezze-fisiche",
      title: "Grandezze Fisiche",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "fisica" as const,
    },
    {
      id: "misure-errori",
      title: "Misure e Errori",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "fisica" as const,
    },
    {
      id: "checkpoint-2",
      title: "Checkpoint: Fisica di Base",
      type: "checkpoint" as const,
      status: "locked" as const,
      materia: "fisica" as const,
    },
  ],
  "2° Quadrimestre": [
    {
      id: "numeri-interi",
      title: "Numeri Interi",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
    {
      id: "frazioni",
      title: "Frazioni e Decimali",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
    {
      id: "proporzioni",
      title: "Rapporti e Proporzioni",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
    {
      id: "checkpoint-3",
      title: "Checkpoint: Numeri Razionali",
      type: "checkpoint" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
    {
      id: "moto-rettilineo",
      title: "Moto Rettilineo",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "fisica" as const,
    },
    {
      id: "velocita-accelerazione",
      title: "Velocità e Accelerazione",
      type: "lesson" as const,
      status: "locked" as const,
      materia: "fisica" as const,
    },
    {
      id: "checkpoint-finale",
      title: "🏆 Checkpoint Finale",
      type: "checkpoint" as const,
      status: "locked" as const,
      materia: "matematica" as const,
    },
  ],
};

type LessonStatus = "completed" | "current" | "locked";
type LessonType = "lesson" | "checkpoint";
type Materia = "matematica" | "fisica";

interface LessonNode {
  id: string;
  title: string;
  type: LessonType;
  status: LessonStatus;
  materia: Materia;
}

export default function RoadmapView() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const getStatusIcon = (node: LessonNode) => {
    if (node.type === "checkpoint") {
      if (node.status === "completed") {
        return <Trophy className="w-7 h-7 text-amber-500 drop-shadow-sm" />;
      }
      return <Trophy className="w-7 h-7 text-slate-400" />;
    }

    switch (node.status) {
      case "completed":
        return (
          <CheckCircle className="w-6 h-6 text-emerald-500 drop-shadow-sm" />
        );
      case "current":
        return (
          <div className="relative">
            <Circle className="w-6 h-6 text-blue-500 fill-blue-100 [.dark_&]:fill-blue-900/50" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        );
      case "locked":
        return <Lock className="w-6 h-6 text-slate-400" />;
    }
  };

  const getNodeColors = (node: LessonNode) => {
    if (node.type === "checkpoint") {
      return node.status === "completed"
        ? "bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300 text-amber-800 shadow-amber-200/50 [.dark_&]:from-amber-900/20 [.dark_&]:to-yellow-900/20 [.dark_&]:border-amber-700 [.dark_&]:text-amber-300"
        : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-600 [.dark_&]:from-slate-800 [.dark_&]:to-slate-700 [.dark_&]:border-slate-600 [.dark_&]:text-slate-400";
    }

    const materiaColors = {
      matematica: {
        completed:
          "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-300 text-blue-800 shadow-blue-200/50 [.dark_&]:from-blue-900/20 [.dark_&]:to-blue-800/20 [.dark_&]:border-blue-700 [.dark_&]:text-blue-300",
        current:
          "bg-gradient-to-br from-blue-100 to-blue-200 border-blue-400 text-blue-900 shadow-blue-300/50 [.dark_&]:from-blue-800/40 [.dark_&]:to-blue-700/40 [.dark_&]:border-blue-600 [.dark_&]:text-blue-200",
        locked:
          "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-500 [.dark_&]:from-slate-800 [.dark_&]:to-slate-700 [.dark_&]:border-slate-600 [.dark_&]:text-slate-400",
      },
      fisica: {
        completed:
          "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-300 text-emerald-800 shadow-emerald-200/50 [.dark_&]:from-emerald-900/20 [.dark_&]:to-emerald-800/20 [.dark_&]:border-emerald-700 [.dark_&]:text-emerald-300",
        current:
          "bg-gradient-to-br from-emerald-100 to-emerald-200 border-emerald-400 text-emerald-900 shadow-emerald-300/50 [.dark_&]:from-emerald-800/40 [.dark_&]:to-emerald-700/40 [.dark_&]:border-emerald-600 [.dark_&]:text-emerald-200",
        locked:
          "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300 text-slate-500 [.dark_&]:from-slate-800 [.dark_&]:to-slate-700 [.dark_&]:border-slate-600 [.dark_&]:text-slate-400",
      },
    };

    return materiaColors[node.materia][node.status];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 [.dark_&]:from-slate-900 [.dark_&]:via-slate-800 [.dark_&]:to-slate-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4"
          >
            🎯 Roadmap 1° Liceo Scientifico
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-600 [.dark_&]:text-slate-300 mb-8"
          >
            Il tuo percorso completo di matematica e fisica
          </motion.p>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-8 bg-white [.dark_&]:bg-slate-800 rounded-2xl px-8 py-4 shadow-lg border border-slate-200 [.dark_&]:border-slate-700"
          >
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-300">
                Matematica
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-sm"></div>
              <span className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-300">
                Fisica
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-300">
                Checkpoint
              </span>
            </div>
          </motion.div>
        </div>

        <div className="relative">
          {Object.entries(roadmapData).map(
            ([quadrimestre, lessons], quadIndex) => (
              <div key={quadrimestre} className="mb-20">
                {/* Intestazione Quadrimestre */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: quadIndex * 0.2 }}
                  className="flex items-center justify-center mb-12"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl blur opacity-30"></div>
                    <div className="relative bg-white [.dark_&]:bg-slate-800 rounded-2xl px-8 py-4 shadow-xl border border-slate-200 [.dark_&]:border-slate-700">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-indigo-600 [.dark_&]:text-indigo-400" />
                        <span className="text-xl font-bold text-slate-800 [.dark_&]:text-slate-200">
                          {quadrimestre}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Path delle lezioni */}
                <div className="relative">
                  {/* Linea centrale con gradiente */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 top-8 bottom-8">
                    <div className="w-1 h-full bg-gradient-to-b from-indigo-200 via-indigo-300 to-indigo-400 [.dark_&]:from-indigo-800 [.dark_&]:via-indigo-700 [.dark_&]:to-indigo-600 rounded-full shadow-sm"></div>
                  </div>

                  <div className="space-y-6">
                    {lessons.map((lesson, index) => {
                      const isLeft = index % 2 === 0;

                      return (
                        <motion.div
                          key={lesson.id}
                          initial={{ opacity: 0, x: isLeft ? -50 : 50, y: 20 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{
                            delay: (quadIndex * lessons.length + index) * 0.05,
                          }}
                          className="relative flex items-center"
                        >
                          {/* Connettore orizzontale */}
                          <div
                            className={`absolute top-1/2 transform -translate-y-1/2 h-0.5 bg-gradient-to-${isLeft ? "r" : "l"} from-slate-300 to-indigo-300 [.dark_&]:from-slate-600 [.dark_&]:to-indigo-600 ${
                              isLeft ? "left-1/2 ml-2" : "right-1/2 mr-2"
                            } w-16 z-0`}
                          ></div>

                          {/* Pallino sulla linea centrale */}
                          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                lesson.status === "completed"
                                  ? "bg-emerald-500 border-emerald-600"
                                  : lesson.status === "current"
                                    ? "bg-blue-500 border-blue-600 shadow-lg shadow-blue-500/30"
                                    : "bg-slate-300 border-slate-400 [.dark_&]:bg-slate-600 [.dark_&]:border-slate-500"
                              }`}
                            ></div>
                          </div>

                          {/* Card lezione */}
                          <div
                            className={`${isLeft ? "pr-20" : "pl-20"} w-full`}
                          >
                            <motion.button
                              onClick={() => setSelectedNode(lesson.id)}
                              whileHover={
                                lesson.status !== "locked"
                                  ? { scale: 1.02, y: -2 }
                                  : {}
                              }
                              whileTap={
                                lesson.status !== "locked"
                                  ? { scale: 0.98 }
                                  : {}
                              }
                              disabled={lesson.status === "locked"}
                              className={`
                              ${getNodeColors(lesson)}
                              ${lesson.status === "locked" ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:shadow-xl"}
                              ${isLeft ? "ml-0 mr-auto" : "ml-auto mr-0"}
                              w-80 p-5 rounded-2xl border-2 transition-all duration-300
                              ${lesson.type === "checkpoint" ? "py-6 border-dashed" : ""}
                              ${selectedNode === lesson.id ? "ring-2 ring-indigo-400 ring-offset-2 shadow-2xl" : "shadow-lg"}
                              backdrop-blur-sm
                            `}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  {getStatusIcon(lesson)}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <h3
                                    className={`font-bold truncate ${lesson.type === "checkpoint" ? "text-lg" : "text-base"}`}
                                  >
                                    {lesson.title}
                                  </h3>
                                  {lesson.status === "current" && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                      <span className="text-xs font-semibold text-blue-600 [.dark_&]:text-blue-400">
                                        In corso
                                      </span>
                                    </div>
                                  )}
                                  {lesson.status === "completed" && (
                                    <div className="flex items-center gap-1 mt-2">
                                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                                      <span className="text-xs font-medium text-emerald-600 [.dark_&]:text-emerald-400">
                                        Completata
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Separatore tra quadrimestri */}
                {quadIndex < Object.keys(roadmapData).length - 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (quadIndex + 1) * 0.5 }}
                    className="flex items-center justify-center my-20"
                  >
                    <div className="flex items-center w-full max-w-md">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 to-slate-400 [.dark_&]:via-slate-600 [.dark_&]:to-slate-500"></div>
                      <div className="mx-6 px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 [.dark_&]:from-slate-700 [.dark_&]:to-slate-600 rounded-full shadow-sm">
                        <span className="text-sm font-bold text-slate-600 [.dark_&]:text-slate-300 whitespace-nowrap">
                          Fine {quadrimestre.split("°")[0]}° Quadrimestre
                        </span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-300 to-slate-400 [.dark_&]:via-slate-600 [.dark_&]:to-slate-500"></div>
                    </div>
                  </motion.div>
                )}
              </div>
            )
          )}

          {/* Footer stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-white/80 [.dark_&]:bg-slate-800/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-slate-200 [.dark_&]:border-slate-700 mt-16"
          >
            <h3 className="text-2xl font-bold text-center mb-6 text-slate-900 [.dark_&]:text-white">
              📊 I tuoi progressi
            </h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-emerald-50 [.dark_&]:bg-emerald-900/20 rounded-2xl">
                <div className="text-3xl font-bold text-emerald-600 [.dark_&]:text-emerald-400 mb-1">
                  2
                </div>
                <div className="text-sm font-medium text-emerald-700 [.dark_&]:text-emerald-300">
                  Completate
                </div>
              </div>
              <div className="text-center p-4 bg-blue-50 [.dark_&]:bg-blue-900/20 rounded-2xl">
                <div className="text-3xl font-bold text-blue-600 [.dark_&]:text-blue-400 mb-1">
                  1
                </div>
                <div className="text-sm font-medium text-blue-700 [.dark_&]:text-blue-300">
                  In corso
                </div>
              </div>
              <div className="text-center p-4 bg-slate-50 [.dark_&]:bg-slate-700/20 rounded-2xl">
                <div className="text-3xl font-bold text-slate-600 [.dark_&]:text-slate-400 mb-1">
                  11
                </div>
                <div className="text-sm font-medium text-slate-700 [.dark_&]:text-slate-300">
                  Da fare
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
