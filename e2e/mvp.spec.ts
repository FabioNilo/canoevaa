import { expect, test } from "@playwright/test";

test("home lista experiências", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /descubra ilhéus/i })).toBeVisible();
  await expect(page.getByText("Nascer do Sol")).toBeVisible();
});

test("reserva bloqueia menos que o mínimo", async ({ page }) => {
  await page.goto("/reserva");

  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByRole("button", { name: /continuar/i }).click();
  await page.getByRole("button", { name: /diminuir participantes/i }).click();
  await expect(page.getByText("Esta experiência exige no mínimo 4 participantes.")).toBeVisible();
});

test("admin redireciona para login e entra com credenciais de desenvolvimento", async ({ page }) => {
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: /ILHÉUS CANOE VA'A/i })).toBeVisible();
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.getByRole("heading", { name: /reservas e agenda/i })).toBeVisible({ timeout: 15_000 });
});
