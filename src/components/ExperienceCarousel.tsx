"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { ExperienceImage } from "@/domain/types";

type Props = {
  images: ExperienceImage[];
};

export function ExperienceCarousel({ images }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentImage = images[currentIndex];

  function goToPrevious() {
    setCurrentIndex((index) => (index === 0 ? images.length - 1 : index - 1));
  }

  function goToNext() {
    setCurrentIndex((index) => (index === images.length - 1 ? 0 : index + 1));
  }

  if (!currentImage) {
    return null;
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-deep">
      {images.map((image, index) => (
        <Image
          key={image.id}
          src={image.src}
          alt={image.alt}
          fill
          priority={index === 0}
          sizes="100vw"
          quality={94}
          className={`object-cover transition-opacity duration-700 ease-out ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
          style={{ objectPosition: image.objectPosition ?? "center" }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-deep/18 via-deep/20 to-deep/88" />

      {images.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={goToPrevious}
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/18 text-white backdrop-blur transition hover:bg-white/28 sm:left-6 sm:h-12 sm:w-12"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            aria-label="Próxima foto"
            onClick={goToNext}
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/18 text-white backdrop-blur transition hover:bg-white/28 sm:right-6 sm:h-12 sm:w-12"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute right-4 top-6 flex gap-2 sm:hidden">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  index === currentIndex ? "w-8 bg-white" : "w-2.5 bg-white/46"
                }`}
              />
            ))}
          </div>

          <div className="absolute bottom-6 right-6 hidden gap-2 sm:flex">
            {images.map((image, index) => (
              <button
                key={image.id}
                type="button"
                aria-label={`Ver foto ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
                className={`relative h-14 w-20 overflow-hidden rounded-xl border transition ${
                  index === currentIndex ? "border-white" : "border-white/28 opacity-72 hover:opacity-100"
                }`}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="80px"
                  quality={72}
                  className="object-cover"
                  style={{ objectPosition: image.objectPosition ?? "center" }}
                />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {currentImage.caption ? (
        <p className="absolute right-4 top-6 hidden max-w-xs rounded-full bg-deep/42 px-4 py-2 text-right text-sm font-semibold text-white backdrop-blur sm:block">
          {currentImage.caption}
        </p>
      ) : null}
    </div>
  );
}
