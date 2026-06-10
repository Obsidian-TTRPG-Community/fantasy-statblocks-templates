---
tags: [bestiary, dnd-2024]
---

# Ancient Auric Wyrm

This note shows the **in-note format** for a creature using the **SRD 2024
Statblock** layout. The `statblock` code block references the installed layout
by name with the `layout` field. It demonstrates the 2024 features: an
`initiative` modifier (the layout shows the score in parentheses), the ability
**Mod/Save grid**, a `cr` with an optional `lair_xp` for "in lair" XP, and
consolidated 2024-style actions, spellcasting, and legendary/lair actions.

> Original creature and flavor text — not from any published book.


layout: SRD 2024 Statblock
name: Ancient Auric Wyrm
size: Gargantuan
type: Dragon
subtype: Metallic
alignment: Lawful Good
ac: 22
initiative: 16
hp: 546
hit_dice: 28d20 + 252
speed: 40 ft., Fly 80 ft., Swim 40 ft.
stats: [30, 14, 29, 18, 17, 28]
saves:
  Dexterity: 9
  Wisdom: 10
skillsaves:
  Insight: 10
  Perception: 17
  Persuasion: 16
  Stealth: 9
damage_immunities: Fire
senses: Blindsight 60 ft., Darkvision 120 ft.; Passive Perception 27
languages: Common, Draconic
cr: "24"
lair_xp: 75000
traits:
  - name: Amphibious
    desc: "The wyrm can breathe air and water."
  - name: Legendary Resistance (4/Day, or 5/Day in Lair)
    desc: "If the wyrm fails a saving throw, it can choose to succeed instead."
actions:
  - name: Multiattack
    desc: "The wyrm makes three Rend attacks. It can replace one attack with a use of (A) Spellcasting to cast Guiding Bolt (level 4 version) or (B) Weakening Breath."
  - name: Rend
    desc: "Melee Attack Roll: +17, reach 15 ft. Hit: 19 (2d8 + 10) Slashing damage plus 9 (2d8) Fire damage."
  - name: Fire Breath (Recharge 5-6)
    desc: "Dexterity Saving Throw: DC 24, each creature in a 90-foot Cone. Failure: 71 (13d10) Fire damage. Success: Half damage."
  - name: Weakening Breath
    desc: "Strength Saving Throw: DC 24, each creature that isn't currently affected by this breath in a 90-foot Cone. Failure: The target has Disadvantage on Strength-based D20 Tests and subtracts 5 (1d10) from its damage rolls. It repeats the save at the end of each of its turns, ending the effect on itself on a success. After 1 minute, it succeeds automatically."
  - name: Spellcasting
    desc: "The wyrm casts one of the following spells, requiring no Material components and using Charisma as the spellcasting ability (spell save DC 24):\n\n**At Will:** Detect Magic, Guiding Bolt (level 4 version), Shapechange.\n\n**1/Day Each:** Flame Strike (level 6 version), Word of Recall, Zone of Truth."
legendary_description: "Legendary Action Uses: 3 (4 in Lair). Immediately after another creature's turn, the wyrm can expend a use to take one of the following actions. The wyrm regains all expended uses at the start of each of its turns."
legendary_actions:
  - name: Banish
    desc: "Charisma Saving Throw: DC 24, one creature the wyrm can see within 120 feet. Failure: 24 (7d6) Force damage, and the target has the Incapacitated condition and is transported to a harmless demiplane until the start of the wyrm's next turn, when it reappears in an unoccupied space of its choice within 120 feet. Failure or Success: The wyrm can't take this action again until the start of its next turn."
  - name: Guiding Light
    desc: "The wyrm uses Spellcasting to cast Guiding Bolt (level 4 version). The wyrm can't take this action again until the start of its next turn."
  - name: Pounce
    desc: "The wyrm moves up to half its Speed, and it makes one Rend attack."
lair_actions:
  - name: ""
    desc: "On Initiative Count 20 (losing ties), the wyrm takes a Lair Action to cause one of the following effects; it can't use the same effect two rounds in a row:"
  - name: Gilded Glare
    desc: "Light blazes from the wyrm. Each creature of its choice within 60 feet makes a DC 15 Wisdom save or has the Blinded condition until Initiative Count 20 on the next round."
  - name: Shifting Vault
    desc: "The wyrm reshapes its lair. Each creature on the ground within the lair makes a DC 15 Dexterity save or has the Prone condition."
regional_effects:
  - name: ""
    desc: "While the wyrm lives, its lair warps the surrounding land, creating one or more of these effects:"
  - name: Beneficent Mist
    desc: "Opalescent mist drifts within 6 miles of the lair, warning non-evil creatures of nearby danger."
  - name: Liar's Revelation
    desc: "Within 6 miles, a creature attempting a deliberate lie makes a DC 15 Charisma save or blurts the truth instead."
