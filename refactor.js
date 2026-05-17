const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/admin-web/src/pages/CustomerFormulasPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove state variables that are no longer needed
content = content.replace(
  /const \[showForm, setShowForm\] = useState\(false\);\n  const \[editingId, setEditingId\] = useState<string \| null>\(null\);\n  const \[viewingFormula, setViewingFormula\] = useState<CustomerTeaFormula \| null>\(null\);/g,
  ''
);

// 2. Remove mutations that are no longer needed (delete, duplicate, setDefault)
content = content.replace(/const deleteMutation = useMutation\(\{[\s\S]*?\}\);\n\n  const duplicateMutation = useMutation\(\{[\s\S]*?\}\);\n\n  const setDefaultMutation = useMutation\(\{[\s\S]*?\}\);/g, '');

// 3. Update saveMutation onSuccess and mutationFn
content = content.replace(
  /const saveMutation = useMutation\(\{[\s\S]*?mutationFn: \(payload: any\) => \{[\s\S]*?if \(editingId\) \{[\s\S]*?return api\(`\$\{endpoints\.customerTeaFormulas\}\/\$\{editingId\}`[\s\S]*?\}\n      return api\(endpoints\.customerTeaFormulas, \{\n        method: 'POST',\n        body: JSON\.stringify\(payload\),\n      \}\);\n    \},[\s\S]*?onSuccess: \(\) => \{[\s\S]*?closeFormHandler\(\);[\s\S]*?queryClient\.invalidateQueries\(\{[\s\S]*?\}\);\n    \},/g,
  `const saveMutation = useMutation({
    mutationFn: (payload: any) => {
      return api(endpoints.customerTeaFormulas, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      resetForm();
      alert('Formula successfully saved!');
      queryClient.invalidateQueries({
        queryKey: [endpoints.customerTeaFormulas],
      });
    },`
);

// 4. Update openFormHandler and closeFormHandler -> replace with resetForm
content = content.replace(
  /const openFormHandler = \(item\?: CustomerTeaFormula\) => \{[\s\S]*?const closeFormHandler = \(\) => \{[\s\S]*?setEditingId\(null\);\n  \};/g,
  `const resetForm = () => {
    setCustomerId('');
    setFormulaName('');
    setTeaPowderType('');
    setLineItems([
      {
        purchaseBatchCode: '',
        purchaseBatchLineItemId: '',
        ingredientCategory: 'Leaf',
        ingredientName: '',
        quantityInGrams: 0,
        pricePerGram: 0,
        rowCost: 0,
      },
    ]);
    setIsDefault(false);
    setNotes('');
    setStatus('Active');
  };`
);

// 5. Remove the {showForm && ( wrap around the card
content = content.replace(/{showForm && \(\n\s*<Card/g, '<Card');

// 6. Remove the close button inside the Card
content = content.replace(
  /<button\n\s*onClick=\{closeFormHandler\}[\s\S]*?<X size=\{18\} \/>\n\s*<\/button>/g,
  ''
);

// 7. Update editingId ternary checks
content = content.replace(/\{editingId \? 'Modify Tea Blending Formula' : 'Design Custom Tea Formula'\}/g, "'Design Custom Tea Formula'");
content = content.replace(/\{editingId \? 'Apply' : 'Save'\}/g, "'Save'");

// 8. Remove the Cancel button inside the form
content = content.replace(
  /<Button\n\s*type="button"\n\s*onClick=\{closeFormHandler\}\n\s*variant="secondary"\n\s*className="flex-1 h-9 text-xs bg-white"\n\s*>\n\s*Cancel\n\s*<\/Button>/g,
  ''
);

// 9. Remove the Formulas table and viewing modal (slice from ')}' to end)
const splitMarker = '          </form>\n        </Card>\n      )}\n\n      {/* 4. Formulas Records Explorer Panel */}';
if (content.includes(splitMarker)) {
  const parts = content.split(splitMarker);
  content = parts[0] + '          </form>\n        </Card>\n    </div>\n  );\n};\n';
} else {
  // If the ')}' has already been affected by the showForm removal, fallback split
  const fallbackMarker = '          </form>\n        </Card>\n\n      {/* 4. Formulas Records Explorer Panel */}';
  if (content.includes(fallbackMarker)) {
    const parts = content.split(fallbackMarker);
    content = parts[0] + '          </form>\n        </Card>\n    </div>\n  );\n};\n';
  } else {
      console.log('Failed to find split marker for table removal!');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactoring complete!');
