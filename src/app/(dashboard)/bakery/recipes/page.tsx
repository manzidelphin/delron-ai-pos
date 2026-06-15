"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { RecipeCard } from "@/components/bakery/recipe-card";
import { formatRWF } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, X, Loader2, ChefHat, Trash2, Calculator } from "lucide-react";

interface IngredientRow {
  raw_material_id: string;
  quantity_needed: string;
  unit: string;
}

interface RecipeFormState {
  finished_good_id: string;
  name: string;
  yield_quantity: string;
  yield_unit: string;
  instructions: string;
  ingredients: IngredientRow[];
}

interface RawMaterial { id: string; name: string; unit: string; cost_per_unit: number; }
interface FinishedGood { id: string; name: string; selling_price: number; }
interface Recipe {
  id: string;
  name: string;
  yield_quantity: number;
  yield_unit: string;
  ingredient_count: number;
  batch_cost: number;
  cost_per_piece: number;
  profit_per_piece: number;
  finished_goods?: { name: string; selling_price: number; barcode_type: string } | null;
  recipe_ingredients?: Array<{ id: string; raw_material_id: string; quantity_needed: number; unit: string; raw_materials?: { name: string; unit: string; cost_per_unit: number } | null }>;
}

const EMPTY_FORM: RecipeFormState = {
  finished_good_id: "",
  name: "",
  yield_quantity: "50",
  yield_unit: "pieces",
  instructions: "",
  ingredients: [{ raw_material_id: "", quantity_needed: "", unit: "kg" }],
};

function RecipeModal({
  recipe,
  materials,
  finishedGoods,
  onClose,
  onSave,
}: {
  recipe: Recipe | null;
  materials: RawMaterial[];
  finishedGoods: FinishedGood[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = !!recipe;
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<RecipeFormState>(() => {
    if (recipe) {
      return {
        finished_good_id: recipe.finished_goods ? "" : "",
        name: recipe.name,
        yield_quantity: String(recipe.yield_quantity),
        yield_unit: recipe.yield_unit,
        instructions: "",
        ingredients: (recipe.recipe_ingredients ?? []).map((ri) => ({
          raw_material_id: ri.raw_material_id,
          quantity_needed: String(ri.quantity_needed),
          unit: ri.unit,
        })),
      };
    }
    return EMPTY_FORM;
  });
  const [isLoading, setIsLoading] = useState(false);

  const batchCost = form.ingredients.reduce((sum, ing) => {
    const mat = materials.find((m) => m.id === ing.raw_material_id);
    return sum + (mat ? mat.cost_per_unit * (parseFloat(ing.quantity_needed) || 0) : 0);
  }, 0);

  const yield_qty = parseFloat(form.yield_quantity) || 1;
  const costPerPiece = batchCost / yield_qty;
  const fg = finishedGoods.find((f) => f.id === form.finished_good_id);
  const sellingPrice = fg?.selling_price ?? 0;
  const profitPerPiece = sellingPrice - costPerPiece;

  const addIngredient = () =>
    setForm((p) => ({ ...p, ingredients: [...p.ingredients, { raw_material_id: "", quantity_needed: "", unit: "kg" }] }));

  const removeIngredient = (i: number) =>
    setForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, idx) => idx !== i) }));

  const setIngredient = (i: number, key: keyof IngredientRow, val: string) =>
    setForm((p) => {
      const ings = [...p.ingredients];
      ings[i] = { ...ings[i], [key]: val };
      const mat = key === "raw_material_id" ? materials.find((m) => m.id === val) : null;
      if (mat) ings[i].unit = mat.unit;
      return { ...p, ingredients: ings };
    });

  const handleSave = async () => {
    if (!form.finished_good_id || !form.name.trim() || !form.yield_quantity) {
      toast.error("Please complete Step 1 first");
      return;
    }
    const validIngs = form.ingredients.filter((i) => i.raw_material_id && i.quantity_needed);
    setIsLoading(true);
    try {
      const url = isEdit ? `/api/bakery/recipes/${recipe!.id}` : "/api/bakery/recipes";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, yield_quantity: parseFloat(form.yield_quantity), ingredients: validIngs }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      toast.success(isEdit ? "Recipe updated!" : "Recipe created!");
      onSave();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Recipe" : "New Recipe"}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-5 pt-4 pb-3 border-b border-slate-700/50 shrink-0">
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => setStep(s)} className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${step === s ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
              Step {s}: {s === 1 ? "Basic Info" : s === 2 ? "Ingredients" : "Instructions"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Baked Item *</label>
                <select value={form.finished_good_id} onChange={(e) => setForm((p) => ({ ...p, finished_good_id: e.target.value, name: finishedGoods.find((f) => f.id === e.target.value)?.name + " Recipe" || p.name }))}
                  className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Select item this recipe makes --</option>
                  {finishedGoods.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Recipe Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Mandazi Classic Recipe"
                  className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">This recipe makes *</label>
                  <input type="number" value={form.yield_quantity} onChange={(e) => setForm((p) => ({ ...p, yield_quantity: e.target.value }))} placeholder="50"
                    className="w-full h-11 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1.5">Unit</label>
                  <select value={form.yield_unit} onChange={(e) => setForm((p) => ({ ...p, yield_unit: e.target.value }))}
                    className="w-full h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {["pieces", "loaves", "kg", "packs", "dozen"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select value={ing.raw_material_id} onChange={(e) => setIngredient(i, "raw_material_id", e.target.value)}
                      className="flex-1 h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                      <option value="">Select ingredient</option>
                      {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>)}
                    </select>
                    <input type="number" value={ing.quantity_needed} onChange={(e) => setIngredient(i, "quantity_needed", e.target.value)} placeholder="Qty"
                      className="w-24 h-11 px-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    <div className="w-16 h-11 flex items-center justify-center bg-slate-900 border border-slate-700 rounded-xl text-slate-400 text-xs">
                      {ing.unit || "—"}
                    </div>
                    <button onClick={() => removeIngredient(i)} disabled={form.ingredients.length <= 1}
                      className="w-11 h-11 rounded-xl bg-slate-700 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 disabled:opacity-30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={addIngredient} className="w-full h-10 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400 text-sm font-medium transition-all">
                + Add Ingredient
              </button>

              {/* Live cost calculator */}
              <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">Live Cost Calculator</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Batch cost</span>
                    <span className="text-amber-400 font-bold">{formatRWF(batchCost)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Cost per piece</span>
                    <span className="text-white font-bold">{formatRWF(costPerPiece)}</span>
                  </div>
                  {fg && (
                    <>
                      <div className="flex justify-between text-slate-400">
                        <span>Selling price</span>
                        <span className="text-white">{formatRWF(sellingPrice)}</span>
                      </div>
                      <div className={`flex justify-between font-black text-base pt-1 border-t border-slate-700 mt-1 ${profitPerPiece >= 0 ? "text-green-400" : "text-red-400"}`}>
                        <span>Profit per piece</span>
                        <span>{profitPerPiece >= 0 ? "+" : ""}{formatRWF(profitPerPiece)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 block mb-1.5">Baking Instructions (optional)</label>
                <textarea value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
                  placeholder={"1. Mix flour and sugar...\n2. Add eggs and butter...\n3. Knead for 10 minutes...\n4. Bake at 180°C for 25 minutes"}
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 flex justify-between shrink-0">
          <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}
            className="h-11 px-6 rounded-xl border border-slate-600 text-slate-300 font-medium disabled:opacity-30">
            ← Back
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Next →
              </button>
            ) : (
              <button onClick={handleSave} disabled={isLoading}
                className="h-11 px-6 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold disabled:opacity-50 flex items-center gap-2">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChefHat className="w-4 h-4" />}
                {isEdit ? "Save Recipe" : "Create Recipe"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [finishedGoods, setFinishedGoods] = useState<FinishedGood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [target, setTarget] = useState<Recipe | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recRes, matRes, fgRes] = await Promise.all([
        fetch("/api/bakery/recipes"),
        fetch("/api/bakery/materials"),
        fetch("/api/bakery/finished-goods"),
      ]);
      const [recJson, matJson, fgJson] = await Promise.all([recRes.json(), matRes.json(), fgRes.json()]);
      if (recRes.ok) setRecipes(recJson.recipes ?? []);
      if (matRes.ok) setMaterials(matJson.materials ?? []);
      if (fgRes.ok) setFinishedGoods(fgJson.items ?? []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recipe?")) return;
    const res = await fetch(`/api/bakery/recipes/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Recipe deleted"); load(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Recipes"
        badge={recipes.length}
        description="Manage baking recipes and ingredient requirements"
        actions={
          <button onClick={() => { setTarget(null); setModal("add"); }}
            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all">
            <Plus className="w-4 h-4" /> New Recipe
          </button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-64 bg-slate-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : recipes.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-16 text-center">
          <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No recipes yet</p>
          <p className="text-slate-500 text-sm mt-1">Create your first recipe to track ingredient usage</p>
          <button onClick={() => { setTarget(null); setModal("add"); }}
            className="mt-4 h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all">
            Create First Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.map((r) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              onEdit={(id) => { setTarget(recipes.find((x) => x.id === id) ?? null); setModal("edit"); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {(modal === "add" || modal === "edit") && (
        <RecipeModal
          recipe={modal === "edit" ? target : null}
          materials={materials}
          finishedGoods={finishedGoods}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
